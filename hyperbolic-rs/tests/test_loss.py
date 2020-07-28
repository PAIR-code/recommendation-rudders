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
import tensorflow as tf
import numpy as np
from collections import namedtuple
from unittest.mock import MagicMock
from rudders.models import DistEuclidean
from rudders.losses import PairwiseHingeLoss, SemanticLoss, CompositeLoss
from rudders.utils import set_seed


def get_flags(initializer='RandomUniform', regularizer='L2Regularizer', dims=32, neg_sample_size=1, margin=1,
              item_reg=0, user_reg=0, gamma=1, semantic_gamma=1, distortion_gamma=-1, distortion_neg_sample_size=1,
              neighbors=1):

    Flags = namedtuple("Flags", ['initializer', 'regularizer', 'dims', 'neg_sample_size', 'margin', 'item_reg',
                                 'user_reg', 'gamma', 'semantic_gamma', 'distortion_gamma',
                                 'distortion_neg_sample_size',
                                 'neighbors'])

    return Flags(
        initializer=initializer,
        regularizer=regularizer,
        dims=dims,
        neg_sample_size=neg_sample_size,
        margin=margin,
        item_reg=item_reg,
        user_reg=user_reg,
        gamma=gamma,
        semantic_gamma=semantic_gamma,
        distortion_gamma=distortion_gamma,
        distortion_neg_sample_size=distortion_neg_sample_size,
        neighbors=neighbors
    )


class TestLoss(tf.test.TestCase):

    def setUp(self):
        super().setUp()
        set_seed(42, set_tf_seed=True)
        self.dtype = tf.float64
        tf.keras.backend.set_floatx("float64")
        self.flags = get_flags()
        self.n_users = 1
        self.n_items = 1

    def get_model(self, n_users, n_items):
        return DistEuclidean(n_users, n_items, self.flags)

    def test_pairwise_loss_distance_to_pos_equal_margin(self):
        """Loss: margin + dist_pos - dist_neg"""
        dist_to_pos = self.flags.margin
        dist_to_neg = 0

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([-dist_to_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([-dist_to_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = PairwiseHingeLoss(self.n_users, self.n_items, self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertEqual(2 * self.flags.margin, result.numpy().item())

    def test_pairwise_loss_all_distances_are_zero(self):
        """Loss: margin + dist_pos - dist_neg"""
        dist_to_pos = 0
        dist_to_neg = 0

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([-dist_to_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([-dist_to_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = PairwiseHingeLoss(self.n_users, self.n_items, self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertEqual(self.flags.margin, result.numpy().item())

    def test_pairwise_loss_distance_to_neg_equal_margin(self):
        """Loss: margin + dist_pos - dist_neg"""
        dist_to_pos = 0
        dist_to_neg = self.flags.margin

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([-dist_to_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([-dist_to_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = PairwiseHingeLoss(self.n_users, self.n_items, self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertEqual(0, result.numpy().item())

    def test_pairwise_loss_distance_to_neg_above_margin(self):
        """Loss: margin + dist_pos - dist_neg"""
        dist_to_pos = 0
        dist_to_neg = 2 * self.flags.margin

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([-dist_to_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([-dist_to_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = PairwiseHingeLoss(self.n_users, self.n_items, self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertEqual(0, result.numpy().item())

    def test_pairwise_loss_distance_to_neg_above_margin(self):
        """Loss: margin + dist_pos - dist_neg"""
        dist_to_pos = 0
        dist_to_neg = 2 * self.flags.margin

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([-dist_to_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([-dist_to_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = PairwiseHingeLoss(self.n_users, self.n_items, self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertEqual(0, result.numpy().item())

    def test_semantic_loss_no_neighbors_space_distance_zero(self):
        """Graph distance is -1 which means that the items do not have neighbors"""
        space_distance = 0
        graph_distance = -1
        item_distances = np.array([[graph_distance, graph_distance],
                                   [graph_distance, graph_distance]])

        model = self.get_model(self.n_users, 2)
        model.distance = MagicMock(return_value=tf.convert_to_tensor([space_distance], dtype=self.dtype))
        input_batch = tf.convert_to_tensor([[0, 0]], dtype=tf.int64)
        loss = SemanticLoss(self.n_users, self.n_items, self.flags, item_distances=item_distances)

        result = loss.calculate_loss(model, input_batch)

        self.assertEqual(0, result.numpy().item())

    def test_semantic_loss_no_neighbors_space_distance_not_zero(self):
        """Graph distance is -1 which means that the items do not have neighbors"""
        space_distance = 1
        graph_distance = -1
        item_distances = np.array([[graph_distance, graph_distance],
                                   [graph_distance, graph_distance]])

        model = self.get_model(self.n_users, 2)
        model.distance = MagicMock(return_value=tf.convert_to_tensor([space_distance], dtype=self.dtype))
        input_batch = tf.convert_to_tensor([[0, 0]], dtype=tf.int64)
        loss = SemanticLoss(self.n_users, self.n_items, self.flags, item_distances=item_distances)

        result = loss.calculate_loss(model, input_batch)

        self.assertEqual(0, result.numpy().item())

    def test_semantic_loss_with_neighbors_space_distance_zero(self):
        """Graph distance is 1 which means that the items have neighbors one hop away"""
        space_distance = 0
        graph_distance = 1
        item_distances = np.array([[graph_distance, graph_distance],
                                   [graph_distance, graph_distance]])

        model = self.get_model(self.n_users, 2)
        model.distance = MagicMock(return_value=tf.convert_to_tensor([space_distance], dtype=self.dtype))
        input_batch = tf.convert_to_tensor([[0, 0]], dtype=tf.int64)
        loss = SemanticLoss(self.n_users, self.n_items, self.flags, item_distances=item_distances)

        result = loss.calculate_loss(model, input_batch)

        self.assertEqual(0, result.numpy().item())

    def test_semantic_loss_with_neighbors_space_distance_not_zero(self):
        """Graph distance is 1 which means that the items have neighbors one hop away"""
        space_distance = 1
        graph_distance = 1
        item_distances = np.array([[graph_distance, graph_distance],
                                   [graph_distance, graph_distance]])

        model = self.get_model(self.n_users, 2)
        model.distance = MagicMock(return_value=tf.convert_to_tensor([space_distance], dtype=self.dtype))
        input_batch = tf.convert_to_tensor([[0, 0]], dtype=tf.int64)
        loss = SemanticLoss(self.n_users, self.n_items, self.flags, item_distances=item_distances)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 0)

    def test_composite_loss_with_only_pairwise(self):
        """Graph distance is 1 which means that the items have neighbors one hop away"""
        # Pairwise loss setup
        dist_to_pos = self.flags.margin
        dist_to_neg = 0

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([-dist_to_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([-dist_to_neg], dtype=self.dtype)

        # Semantic loss setup
        space_distance = 1
        graph_distance = 1
        item_distances = np.array([[graph_distance, graph_distance],
                                   [graph_distance, graph_distance]])

        # set semantic gamma so we do not use sematic loss
        self.flags = get_flags(semantic_gamma=-1)

        model = self.get_model(self.n_users, 2)
        model.call = MagicMock(side_effect=effect())
        model.distance = MagicMock(return_value=tf.convert_to_tensor([space_distance], dtype=self.dtype))
        input_batch = tf.convert_to_tensor([[0, 0]], dtype=tf.int64)
        loss = CompositeLoss(self.n_users, self.n_items, self.flags, item_distances=item_distances)

        result = loss.calculate_loss(model, input_batch)

        self.assertEqual(2 * self.flags.margin, result.numpy().item())

    def test_composite_loss_with_pairwise_and_composite_loss(self):
        """Graph distance is 1 which means that the items have neighbors one hop away"""
        # Pairwise loss setup
        dist_to_pos = self.flags.margin
        dist_to_neg = 0

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([-dist_to_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([-dist_to_neg], dtype=self.dtype)

        # Semantic loss setup
        space_distance = 1
        graph_distance = 1
        item_distances = np.array([[graph_distance, graph_distance],
                                   [graph_distance, graph_distance]])

        model = self.get_model(self.n_users, 2)
        model.call = MagicMock(side_effect=effect())
        model.distance = MagicMock(return_value=tf.convert_to_tensor([space_distance], dtype=self.dtype))
        input_batch = tf.convert_to_tensor([[0, 0]], dtype=tf.int64)
        loss = CompositeLoss(self.n_users, self.n_items, self.flags, item_distances=item_distances)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 2 * self.flags.margin)
