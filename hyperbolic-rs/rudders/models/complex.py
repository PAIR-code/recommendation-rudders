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
from math import pi


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
    """Complex embeddings with rotations.
    Taken from Sun et al. 2019"""

    def __init__(self, n_entities, n_relations, item_ids, args):
        super().__init__(n_entities, n_relations, item_ids, args)
        self.relations = tf.keras.layers.Embedding(
            input_dim=n_relations,
            output_dim=self.half_dim,
            embeddings_initializer=self.initializer,
            embeddings_regularizer=self.relation_regularizer,
            name='relation_embeddings')

    def get_lhs(self, input_tensor):
        # Adapted from: https://github.com/DeepGraphLearning/KnowledgeGraphEmbedding/blob/master/codes/model.py#L200
        lhs = self.entities(input_tensor[:, 0])
        relation = self.relations(input_tensor[:, 1])
        # separates into real and imaginary parts
        re_head, im_head = lhs[:, :self.half_dim], lhs[:, self.half_dim:]

        # Make phases of relations uniformly distributed in [-pi, pi]
        phase_relation = relation * pi
        re_relation = tf.cos(phase_relation)
        im_relation = tf.sin(phase_relation)

        re_lhs = re_head * re_relation - im_head * im_relation
        im_lhs = re_head * im_relation + im_head * re_relation

        return tf.concat([re_lhs, im_lhs], axis=1)

    def similarity_score(self, lhs, rhs, all_items):
        """Score is based on taking the distance between the two sides
        Adapted from: https://github.com/DeepGraphLearning/KnowledgeGraphEmbedding/blob/master/codes/model.py#L200"""
        real_lhs, imag_lhs = lhs[:, :self.half_dim], lhs[:, self.half_dim:]
        real_rhs, imag_rhs = rhs[:, :self.half_dim], rhs[:, self.half_dim:]

        if all_items:
            result = tf.keras.backend.constant(0.0, shape=(len(lhs), len(rhs)))
            for i in range(self.half_dim):
                real_lhs = tf.expand_dims(lhs[:, i], axis=1)
                real_rhs = tf.transpose(tf.expand_dims(rhs[:, i], axis=1))
                real_comp = real_lhs - real_rhs         # bl x br

                imag_lhs = tf.expand_dims(lhs[:, i + self.half_dim], axis=1)
                imag_rhs = tf.transpose(tf.expand_dims(rhs[:, i + self.half_dim], axis=1))
                imag_comp = imag_lhs - imag_rhs         # bl x br

                result = result + real_comp**2 + imag_comp**2

            return -tf.sqrt(result)

        real_score = real_lhs - real_rhs
        imag_score = imag_lhs - imag_rhs
        score = tf.sqrt(tf.reduce_sum(real_score ** 2 + imag_score ** 2, axis=-1, keepdims=True))
        return -score
