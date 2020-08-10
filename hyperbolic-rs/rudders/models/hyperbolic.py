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
from rudders import hmath


class BaseHyperbolic(CFModel, ABC):
    """Base model class for hyperbolic embeddings with parameters defined in tangent space."""

    def __init__(self, n_entities, n_relations, item_ids, args, train_bias=False):
        super().__init__(n_entities, n_relations, item_ids, args, train_bias)
        # inits c to a value that will result in softplus(c) == curvature
        init_value = tf.math.log(tf.math.exp(tf.keras.backend.constant(args.curvature)) - 1)
        self.c = tf.Variable(initial_value=init_value, trainable=args.train_c)

    def get_c(self):
        return tf.math.softplus(self.c)

    def get_rhs(self, input_tensor):
        return hmath.expmap0(self.entities(input_tensor[:, -1]), self.get_c())

    def similarity_score(self, lhs, rhs, all_items):
        """Score based on square hyperbolic distance"""
        if all_items:
            return -hmath.hyp_distance_all_pairs(lhs, rhs, self.get_c())**2
        return -hmath.hyp_distance(lhs, rhs, self.get_c())**2


class TransH(BaseHyperbolic):
    """Model based on hyperbolic translation with parameters defined in tangent space."""

    def get_lhs(self, input_tensor):
        c = self.get_c()
        head = hmath.expmap0(self.entities(input_tensor[:, 0]), c)
        relations = hmath.expmap0(self.relations(input_tensor[:, 1]), c)
        return hmath.mobius_add(head, relations, c)


class MuRHyperbolic(BaseHyperbolic):
    def __init__(self, n_entities, n_relations, item_ids, args):
        super().__init__(n_entities, n_relations, item_ids, args, train_bias=True)
        self.relation_transforms = tf.keras.layers.Embedding(
            input_dim=n_relations,
            output_dim=self.dims,
            embeddings_initializer=self.initializer,
            embeddings_regularizer=self.relation_regularizer,
            name='relation_transforms')

    def get_lhs(self, input_tensor):
        tg_heads = self.entities(input_tensor[:, 0])
        tg_relation_transforms = self.relation_transforms(input_tensor[:, 1])
        return hmath.expmap0(tg_relation_transforms * tg_heads, self.get_c())

    def get_rhs(self, input_tensor):
        tails = hmath.expmap0(self.entities(input_tensor[:, -1]), self.get_c())
        relation_additions = hmath.expmap0(self.relations(input_tensor[:, 1]), self.get_c())
        return hmath.mobius_add(tails, relation_additions, self.get_c())


class ChamiHyperbolic(BaseChami, BaseHyperbolic):
    """Hyperbolic attention model that combines reflections and rotations from Chami et al. 2020."""

    def get_lhs(self, input_tensor):
        c = self.get_c()
        head_embeds = hmath.expmap0(self.get_heads(input_tensor), c)
        relation_embeds = hmath.expmap0(self.relations(input_tensor[:, 1]), c)
        return hmath.mobius_add(head_embeds, relation_embeds, c)
