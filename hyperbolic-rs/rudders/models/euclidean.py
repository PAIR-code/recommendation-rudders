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
from rudders.models.base import CFModel


class BaseEuclidean(CFModel, ABC):
    """Base model class for Euclidean embeddings."""

    def get_lhs(self, input_tensor):
        return self.entities(input_tensor[:, 0])

    def get_rhs(self, input_tensor):
        return self.entities(input_tensor[:, -1])


class SMFactor(BaseEuclidean):
    """Collaborative Metric Learning model based on Matrix Factorization."""

    def __init__(self, n_users, n_items, n_relations, item_ids, args):
        super().__init__(n_users, n_items, n_relations, item_ids, args, train_bias=False)
        self.relations = None

    def similarity_score(self, lhs, rhs, all_items):
        """Score based on dot product"""
        if all_items:
            return tf.matmul(lhs, tf.transpose(rhs))
        return tf.reduce_sum(lhs * rhs, axis=-1, keepdims=True)


class DistEuclidean(BaseEuclidean):
    """Collaborative Metric Learning model based on Euclidean Distance."""

    def __init__(self, n_users, n_items, n_relations, item_ids, args):
        super().__init__(n_users, n_items, n_relations, item_ids, args, train_bias=False)
        self.relations = None

    def similarity_score(self, lhs, rhs, all_items):
        return -euclidean_sq_distance(lhs, rhs, all_items)


class MultiRelEuclidean(BaseEuclidean):

    def __init__(self, n_users, n_items, n_relations, item_ids, args):
        super().__init__(n_users, n_items, n_relations, item_ids, args, train_bias=True)
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

    def similarity_score(self, lhs, rhs, all_items):
        return -euclidean_sq_distance(lhs, rhs, all_items)


def euclidean_sq_distance(x, y, all_pairs=False):
    """Computes Euclidean squared distance.

    Args:
      x: Tensor of size B1 x d
      y: Tensor of size (B1 x) B2 x d if rhs_dep_lhs = False (True)
      all_pairs: boolean indicating whether to compute all pairwise distances or not. If eval_mode=False, must
      have B1=B2.

    Returns:
      Tensor of size B1 x B2 if eval_mode=True, otherwise Tensor of size B1 x 1.
    """
    x2 = tf.math.reduce_sum(x * x, axis=-1, keepdims=True)
    y2 = tf.math.reduce_sum(y * y, axis=-1, keepdims=True)
    if all_pairs:
        y2 = tf.transpose(y2)
        xy = tf.linalg.matmul(x, y, transpose_b=True)
    else:
        xy = tf.math.reduce_sum(x * y, axis=-1, keepdims=True)
    return x2 + y2 - 2 * xy


def euclidean_distance(x, y, all_pairs=False):
    sq_dist = euclidean_sq_distance(x, y, all_pairs)
    return tf.math.sqrt(tf.maximum(sq_dist, tf.zeros_like(sq_dist)))
