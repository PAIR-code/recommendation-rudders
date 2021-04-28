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
"""Tests of hyperbolic operations.
Hyperbolic distance were verified with https://github.com/geoopt/geoopt"""
import tensorflow as tf
import numpy as np
from rudders.math import hyperb
from rudders.utils import set_seed


class TestHyperbolicMath(tf.test.TestCase):

    def setUp(self):
        super().setUp()
        set_seed(42, set_tf_seed=True)
        self.dtype = tf.float64
        self.c = tf.convert_to_tensor([1.0], dtype=self.dtype)

    def get_point(self, coords: list) -> tf.Tensor:
        """Coords is a list of coordinates to create a point"""
        return tf.convert_to_tensor(coords, dtype=self.dtype)

    def test_distance_to_same_point_is_zero(self):
        a = self.get_point([[0.5, 0.25]])

        result = hyperb.hyp_distance(a, a, self.c)

        expected = tf.convert_to_tensor([[0.]], dtype=tf.float64)
        self.assertAllClose(expected, result)

    def test_distance_between_two_points(self):
        x = self.get_point([[-0.62972, -0.28971]])
        y = self.get_point([[0.37216, -0.38184]])

        result = hyperb.hyp_distance(x, y, self.c)

        expected = tf.convert_to_tensor([[2.55035745]], dtype=tf.float64)
        self.assertAllClose(expected, result)

    def test_distance_is_symmetric(self):
        x = self.get_point([[-0.62972, -0.28971]])
        y = self.get_point([[0.37216, -0.38184]])

        result_xy = hyperb.hyp_distance(x, y, self.c)
        result_yx = hyperb.hyp_distance(y, x, self.c)

        self.assertAllClose(result_xy, result_yx)

    def test_distance_is_non_negative(self):
        x = tf.clip_by_norm(tf.random.uniform((1000, 32), dtype=tf.float64), clip_norm=0.99999, axes=-1)
        y = tf.clip_by_norm(tf.random.uniform((1000, 32), dtype=tf.float64), clip_norm=0.99999, axes=-1)

        result = hyperb.hyp_distance(x, y, self.c)

        self.assertAllGreaterEqual(result, 0)

    def test_distance_all_pairs(self):
        x = tf.repeat(self.get_point([[-0.62972, -0.28971]]), repeats=3, axis=0)
        y = tf.repeat(self.get_point([[0.37216, -0.38184]]), repeats=10, axis=0)

        result = hyperb.hyp_distance_all_pairs(x, y, self.c)

        expected = tf.convert_to_tensor([[2.55035745]], dtype=tf.float64)
        expected = tf.repeat(expected, repeats=3, axis=0)
        expected = tf.repeat(expected, repeats=10, axis=1)

        self.assertShapeEqual(np.ndarray((3, 10)), expected)
        self.assertAllClose(expected, result)
