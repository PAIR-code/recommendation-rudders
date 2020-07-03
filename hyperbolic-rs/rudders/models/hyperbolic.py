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
from rudders import hmath
from rudders.models.euclidean import euclidean_distance


class BaseHyperbolic(CFModel, ABC):
    """Base model class for hyperbolic embeddings with parameters defined in tangent space."""

    def __init__(self, n_users, n_items, args):
        super(BaseHyperbolic, self).__init__(n_users, n_items, args)
        # inits c to a value that will result in softplus(c) == curvature
        init_value = tf.math.log(tf.math.exp(tf.keras.backend.constant(args.curvature)) - 1)
        self.c = tf.Variable(initial_value=init_value, trainable=args.train_c)

    def get_users(self, input_tensor):
        return hmath.expmap0(self.user(input_tensor[:, 0]), self.get_c())

    def get_all_users(self):
        return hmath.expmap0(self.user.embeddings, self.get_c())

    def get_items(self, input_tensor):
        return hmath.expmap0(self.item(input_tensor[:, 1]), self.get_c())

    def get_all_items(self):
        return hmath.expmap0(self.item.embeddings, self.get_c())

    def get_c(self):
        return tf.math.softplus(self.c)


class DistHyperbolic(BaseHyperbolic):

    def score(self, user_embeds, item_embeds, all_pairs):
        """Score based on square hyperbolic distance"""
        c = self.get_c()
        if all_pairs:
            return -hmath.hyp_distance_all_pairs(user_embeds, item_embeds, c) ** 2
        return -hmath.hyp_distance(user_embeds, item_embeds, c) ** 2


class DistanceHyperbolicDistortion(DistHyperbolic):
    """
    Computes distortion of the embeddings according to the formula:
    distortion(u, i) = |hy_dist(u, i) - eu_dist(u, i)| / eu_dist(u, i)
    with u, i \in B^n

    Note that the euclidean distance is calculated with the points already projected onto the hyperbolic
    """

    def distortion(self, input_tensor, all_pairs=False):
        user_embeds = self.get_users(input_tensor)
        all_item_embeds = self.get_all_items() if all_pairs else self.get_items(input_tensor)
        distor = self.distortion_from_embeds(user_embeds, all_item_embeds, all_pairs)
        return distor

    def distortion_from_embeds(self, user_embeds, item_embeds, all_pairs):
        c = self.get_c()
        if all_pairs:
            hy_distance = hmath.hyp_distance_all_pairs(user_embeds, item_embeds, c)
        else:
            hy_distance = hmath.hyp_distance(user_embeds, item_embeds, c)
        eu_distance = euclidean_distance(user_embeds, item_embeds, all_pairs)
        eu_distance = tf.maximum(eu_distance, hmath.MIN_NORM)

        return tf.abs(hy_distance - eu_distance) / eu_distance


class DistanceHyperbolicTangentSpaceDistortion(DistanceHyperbolicDistortion):
    """
    Computes distortion of the embeddings according to the formula:
    distortion(u, i) = |hy_dist(u, i) - eu_dist(f(u), f(i))| / eu_dist(f(u), f(i))
    with u, i \in B^n (Poincare ball) and f(u), f(i) \in R^n (Euclidean space)
    """

    def distortion_from_embeds(self, user_embeds, item_embeds, all_pairs):
        c = self.get_c()
        if all_pairs:
            hy_distance = hmath.hyp_distance_all_pairs(user_embeds, item_embeds, c)
        else:
            hy_distance = hmath.hyp_distance(user_embeds, item_embeds, c)
        eu_distance = euclidean_distance(hmath.logmap0(user_embeds, c), hmath.logmap0(item_embeds, c), all_pairs)
        eu_distance = tf.maximum(eu_distance, hmath.MIN_NORM)

        return tf.abs(hy_distance - eu_distance) / eu_distance
