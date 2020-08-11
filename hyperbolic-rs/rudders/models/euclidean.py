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
from rudders.models.base import CFModel, BaseChami
from rudders.emath import euclidean_sq_distance


class BaseEuclidean(CFModel, ABC):
    """Base model class for Euclidean embeddings."""

    def get_rhs(self, input_tensor):
        return self.entities(input_tensor[:, -1])

    def similarity_score(self, lhs, rhs, all_items):
        return -euclidean_sq_distance(lhs, rhs, all_items)


class CTDecomp(BaseEuclidean):
    """Canonical tensor decomposition."""
    
    def get_lhs(self, input_tensor):
        entities = self.entities(input_tensor[:, 0])
        relations = self.relations(input_tensor[:, 1])
        return tf.multiply(entities, relations)

    def similarity_score(self, lhs, rhs, all_items):
        """Score based on dot product"""
        if all_items:
            return tf.matmul(lhs, tf.transpose(rhs))
        return tf.reduce_sum(lhs * rhs, axis=-1, keepdims=True)


class TransE(BaseEuclidean):
    """Model based on Euclidean Translations (Bordes et al. 2013).
    To establish a closer comparison with the hyperbolic model, we make minor modifications
    from the original Bordes' model.
     - No L2 normalization is applied on the entity embeddings
     - The loss is based on squared Euclidean distance instead of 'just' Euclidean distance
    """

    def get_lhs(self, input_tensor):
        entities = self.entities(input_tensor[:, 0])
        relations = self.relations(input_tensor[:, 1])
        return entities + relations


class MuREuclidean(BaseEuclidean):

    def __init__(self, n_entities, n_relations, item_ids, args):
        super().__init__(n_entities, n_relations, item_ids, args, train_bias=True)
        self.relation_transforms = tf.keras.layers.Embedding(
            input_dim=n_relations,
            output_dim=self.dims,
            embeddings_initializer=self.initializer,
            embeddings_regularizer=self.relation_regularizer,
            name='relation_transforms')

    def get_lhs(self, input_tensor):
        heads = self.entities(input_tensor[:, 0])
        relation_transforms = self.relation_transforms(input_tensor[:, 1])
        return relation_transforms * heads

    def get_rhs(self, input_tensor):
        tails = self.entities(input_tensor[:, -1])
        relation_additions = self.relations(input_tensor[:, 1])
        return tails + relation_additions


class ChamiEuclidean(BaseChami, BaseEuclidean):
    """Euclidean attention model that combines reflections and rotations from Chami et al. 2020."""

    def get_lhs(self, input_tensor):
        head_embeds = self.get_heads(input_tensor)
        rel_embeds = self.relations(input_tensor[:, 1])
        return head_embeds + rel_embeds
