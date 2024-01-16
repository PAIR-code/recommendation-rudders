# Copyright 2017 The Rudders Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from abc import ABC
import tensorflow as tf
from rudders.models.base import CFModel, MuRBase, RotRefBase, UserAttentiveBase
from rudders.math.euclid import euclidean_sq_distance, euclidean_sq_distance_batched_all_pairs


class CFEuclideanBase(CFModel, ABC):
    """Base model class for Euclidean embeddings."""

    def get_rhs(self, input_tensor):
        return self.entities(input_tensor[:, -1])

    def similarity_score(self, lhs, rhs, all_items):
        return -euclidean_sq_distance(lhs, rhs, all_items)


class MLP(CFModel):
    def __init__(self, n_entities, n_relations, item_ids, args):
        super().__init__(n_entities, n_relations, item_ids, args)
        self.relations = None

        self.dense_1 = tf.keras.layers.Dense(units=self.dims, activation=tf.nn.relu)
        self.dense_2 = tf.keras.layers.Dense(units=int(self.dims / 2), activation=tf.nn.relu)
        self.dense_3 = tf.keras.layers.Dense(units=1)
        self.dropout = tf.keras.layers.Dropout(args.dropout)

    def get_lhs(self, input_tensor):
        return self.entities(input_tensor[:, 0])

    def get_rhs(self, input_tensor):
        return self.entities(input_tensor[:, -1])

    def similarity_score(self, lhs, rhs, all_items):
        """
        :param lhs: b x dim
        :param rhs: b x dim. If all_items: n_items x dim
        :param all_items:
        :return: b x 1. If all_items b x n_items
        """
        squeeze = lambda x: x
        if all_items:
            bs, dim = tf.shape(lhs)
            n_items, _ = tf.shape(rhs)
            lhs = tf.broadcast_to(tf.expand_dims(lhs, 1), (bs, n_items, dim))
            rhs = tf.broadcast_to(tf.expand_dims(rhs, 0), (bs, n_items, dim))
            squeeze = lambda x: tf.squeeze(x, axis=-1)

        embeds = tf.concat((lhs, rhs), axis=-1)
        embeds = self.dense_1(self.dropout(embeds, training=self.training))
        embeds = self.dense_2(self.dropout(embeds, training=self.training))
        embeds = self.dense_3(self.dropout(embeds, training=self.training))
        embeds = squeeze(embeds)
        return embeds


class DistMul(CFEuclideanBase):
    
    def get_lhs(self, input_tensor):
        entities = self.entities(input_tensor[:, 0])
        relations = self.relations(input_tensor[:, 1])
        return tf.multiply(entities, relations)

    def similarity_score(self, lhs, rhs, all_items):
        """Score based on dot product"""
        if all_items:
            return tf.matmul(lhs, tf.transpose(rhs))
        return tf.reduce_sum(lhs * rhs, axis=-1, keepdims=True)


class BPR(DistMul):
    """Bayesian personalized ranking.
    Ignores relations and only accounts for (user, item) interactions"""
    def __init__(self, n_entities, n_relations, item_ids, args):
        super().__init__(n_entities, n_relations, item_ids, args)
        self.relations = None

    def get_lhs(self, input_tensor):
        return self.entities(input_tensor[:, 0])


class TransE(CFEuclideanBase):
    """Model based on:
       "Translating Embeddings for Modeling Multi-relational Data" Bordes et al. 2013"""

    def get_lhs(self, input_tensor):
        heads = self.entities(input_tensor[:, 0])
        heads = tf.math.l2_normalize(heads, axis=-1)
        relations = self.relations(input_tensor[:, 1])
        return heads + relations

    def get_rhs(self, input_tensor):
        tails = self.entities(input_tensor[:, -1])
        return tf.math.l2_normalize(tails, axis=-1)


class TransH(CFEuclideanBase):

    def __init__(self, n_entities, n_relations, item_ids, args):
        super().__init__(n_entities, n_relations, item_ids, args)

        self.norm_vector = tf.keras.layers.Embedding(
            input_dim=n_relations,
            output_dim=self.dims,
            embeddings_initializer=self.initializer,
            embeddings_regularizer=self.relation_regularizer,
            name='norm_vector')

    def get_lhs(self, input_tensor):
        heads = self.entities(input_tensor[:, 0])
        heads = tf.clip_by_norm(heads, clip_norm=1, axes=-1)
        norm_vectors = self.norm_vector(input_tensor[:, 1])
        proj_heads = self.project(heads, norm_vectors)

        relations = self.relations(input_tensor[:, 1])
        return proj_heads + relations

    def get_rhs(self, input_tensor):
        tails = self.entities(input_tensor[:, -1])
        tails = tf.clip_by_norm(tails, clip_norm=1, axes=-1)
        norm_vectors = self.norm_vector(input_tensor[:, 1])
        proj_tails = self.project(tails, norm_vectors)
        return proj_tails

    def project(self, entities, norm_vectors):
        """
        :param entities: b x dim
        :param norm_vectors: b x dim
        :return: b x dim
        """
        norm_vectors = tf.math.l2_normalize(norm_vectors, axis=-1)
        dot_prod = tf.reduce_sum(entities * norm_vectors, axis=-1, keepdims=True)
        return entities - dot_prod * norm_vectors


class MuREuclidean(MuRBase, CFEuclideanBase):

    def get_lhs(self, input_tensor):
        heads = self.entities(input_tensor[:, 0])
        heads = self.dropout(heads, training=self.training)
        relation_transforms = self.transforms(input_tensor[:, 1])
        return relation_transforms * heads

    def get_rhs(self, input_tensor):
        tails = self.entities(input_tensor[:, -1])
        relation_additions = self.relations(input_tensor[:, 1])
        return tails + relation_additions


class RotRefEuclidean(RotRefBase, CFEuclideanBase):

    def get_lhs(self, input_tensor):
        head_embeds = self.get_heads(input_tensor)
        rel_embeds = self.relations(input_tensor[:, 1])
        return head_embeds + rel_embeds


class UserAttentiveEuclidean(UserAttentiveBase):

    def similarity_score(self, lhs, rhs, all_items):
        """
        The main difference of this function with the BaseEuclidean score is that when all_items = True,
        rhs will be B1 x B2 x dims, instead of B2 x dims
        :param lhs: B1 x dims
        :param rhs: B1 x dims if all_items = False, else B1 x B2 x dims
        :param all_items:
        :return: B1 x 1 if all_items = False, else B1 x B2
        """
        if all_items:
            return -euclidean_sq_distance_batched_all_pairs(lhs, rhs)
        return -euclidean_sq_distance(lhs, rhs, all_pairs=False)
