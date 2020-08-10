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
from rudders.models.base import CFModel
import tensorflow as tf


class BaseComplex(CFModel, ABC):
    """Base model class for complex embeddings."""

    def __init__(self, n_entities, n_relations, item_ids, args):
        super().__init__(n_entities, n_relations, item_ids, args, train_bias=False)
        assert self.dims % 2 == 0, "Complex models must have an even embedding dimension."
        self.half_dim = self.dims // 2

    def get_rhs(self, input_tensor):
        return self.entities(input_tensor[:, -1])

    def similarity_score(self, lhs, rhs, all_items):
        """Score is based on separating embeddings into real and imaginary parts, taking the inner product
        of each side, and finally adding the results"""
        real_lhs, imag_lhs = lhs[:, :self.half_dim], lhs[:, self.half_dim:]
        real_rhs, imag_rhs = rhs[:, :self.half_dim], rhs[:, self.half_dim:]
        if all_items:
            return tf.matmul(real_lhs, tf.transpose(real_rhs)) + tf.matmul(imag_lhs, tf.transpose(imag_rhs))
        return tf.reduce_sum(real_lhs * real_rhs + imag_lhs * imag_rhs, axis=-1, keepdims=True)


class ComplexProd(BaseComplex):
    """Complex embeddings for simple link prediction.
    Applies the complex product between the head and the relation before scoring"""

    def get_lhs(self, input_tensor):
        lhs = self.entities(input_tensor[:, 0])
        rel = self.relations(input_tensor[:, 1])
        # separates into real and imaginary parts
        lhs = lhs[:, :self.half_dim], lhs[:, self.half_dim:]
        rel = rel[:, :self.half_dim], rel[:, self.half_dim:]
        return tf.concat([lhs[0] * rel[0] - lhs[1] * rel[1], lhs[0] * rel[1] + lhs[1] * rel[0]], axis=1)


class RotatE(BaseComplex):
    """Complex embeddings with Euclidean rotations."""

    def get_lhs(self, input_tensor):
        lhs = self.entities(input_tensor[:, 0])
        rel = self.relations(input_tensor[:, 1])
        # separates into real and imaginary parts
        lhs = lhs[:, :self.half_dim], lhs[:, self.half_dim:]
        rel = rel[:, :self.half_dim], rel[:, self.half_dim:]
        # represents complex number in angular notation
        rel_norm = tf.sqrt(rel[0] ** 2 + rel[1] ** 2)
        cos = tf.math.divide_no_nan(rel[0], rel_norm)
        sin = tf.math.divide_no_nan(rel[1], rel_norm)
        return tf.concat([lhs[0] * cos - lhs[1] * sin, lhs[0] * sin + lhs[1] * cos], axis=1)
