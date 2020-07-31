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
from rudders.losses import UserItemBCELoss, ItemItemBCELoss, CompositeLoss
from rudders.utils import set_seed


def get_flags(initializer='RandomUniform', regularizer='L2Regularizer', dims=32, neg_sample_size=1,
              entity_reg=0, relation_reg=0, gamma=1, semantic_gamma=1, semantic_graph_weight=2, semantic_pos_sample_size=1,
              neighbors=1):

    Flags = namedtuple("Flags", ['initializer', 'regularizer', 'dims', 'neg_sample_size', 'entity_reg', 'relation_reg',
                                 'gamma', 'semantic_gamma', 'semantic_graph_weight',
                                 'semantic_pos_sample_size', 'neighbors'])

    return Flags(
        initializer=initializer,
        regularizer=regularizer,
        dims=dims,
        neg_sample_size=neg_sample_size,
        entity_reg=entity_reg,
        relation_reg=relation_reg,
        gamma=gamma,
        semantic_gamma=semantic_gamma,
        semantic_graph_weight=semantic_graph_weight,
        semantic_pos_sample_size=semantic_pos_sample_size,
        neighbors=neighbors
    )


class TestLoss(tf.test.TestCase):

    def setUp(self):
        super().setUp()
        set_seed(42, set_tf_seed=True)
        self.dtype = tf.float64
        tf.keras.backend.set_floatx("float64")
        self.flags = get_flags()
        self.n_users = 2
        self.n_items = 2
        self.n_relations = 1
        self.item_ids = [0, 1]

    def get_model(self, n_users, n_items):
        return DistEuclidean(n_users, n_items, self.n_relations, self.item_ids, self.flags)

    def test_high_score_pos_low_score_neg_low_loss(self):
        """Loss: margin + dist_pos - dist_neg"""
        score_pos = 50
        score_neg = -50

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = UserItemBCELoss(self.n_users, self.n_items, self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertLess(result.numpy().item(), 0.0001)

    def test_low_score_pos_high_score_neg_high_loss(self):
        """Loss: margin + dist_pos - dist_neg"""
        score_pos = -50
        score_neg = 50

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = UserItemBCELoss(self.n_users, self.n_items, self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 10)

    def test_zero_pos_neg_score_high_loss(self):
        """Loss: margin + dist_pos - dist_neg"""
        score_pos = 0
        score_neg = 0

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = UserItemBCELoss(self.n_users, self.n_items, self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 1)

    def test_equal_positive_pos_neg_score_high_loss(self):
        """Loss: margin + dist_pos - dist_neg"""
        score_pos = 5
        score_neg = 5

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = UserItemBCELoss(self.n_users, self.n_items, self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 1)

    def test_equal_negative_pos_neg_score_high_loss(self):
        """Loss: margin + dist_pos - dist_neg"""
        score_pos = -5
        score_neg = -5

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = UserItemBCELoss(self.n_users, self.n_items, self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 1)

    def test_semantic_no_neighbors_loss_is_zero(self):
        """Graph distance is -1 which means that the items do not have neighbors"""
        graph_distance = -1
        item_distances = np.array([[graph_distance, graph_distance],
                                   [graph_distance, graph_distance]])
        score_pos = -5

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)

        model = self.get_model(self.n_users, 2)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 0]], dtype=tf.int64)
        loss = ItemItemBCELoss(self.n_users, self.n_items, self.flags, item_distances=item_distances)

        result = loss.calculate_loss(model, input_batch)

        self.assertEqual(0, result.numpy().item())

    def test_semantic_high_score_low_loss(self):
        """Graph distance is -1 which means that the items do not have neighbors"""
        graph_distance = 1
        item_distances = np.array([[graph_distance, graph_distance],
                                   [graph_distance, graph_distance]])
        score_pos = 10

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)

        model = self.get_model(self.n_users, 2)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 0]], dtype=tf.int64)
        loss = ItemItemBCELoss(self.n_users, self.n_items, self.flags, item_distances=item_distances)

        result = loss.calculate_loss(model, input_batch)

        self.assertLess(result.numpy().item(), 0.001)

    def test_semantic_zero_score_and_distance_high_loss(self):
        """Graph distance is -1 which means that the items do not have neighbors"""
        graph_distance = 1
        item_distances = np.array([[graph_distance, graph_distance],
                                   [graph_distance, graph_distance]])
        score_pos = 0

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 0]], dtype=tf.int64)
        loss = ItemItemBCELoss(self.n_users, self.n_items, self.flags, item_distances=item_distances)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 0.5)

    def test_composite_loss_with_only_item_user_loss(self):
        """Graph distance is 1 which means that the items have neighbors one hop away"""
        graph_distance = 1
        item_distances = np.array([[graph_distance, graph_distance],
                                   [graph_distance, graph_distance]])
        score_pos = 0
        score_neg = -1

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 0]], dtype=tf.int64)

        # set semantic gamma so we do not use item-item loss
        self.flags = get_flags(semantic_gamma=-1)
        loss = CompositeLoss(self.n_users, self.n_items, self.flags, item_distances=item_distances)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 2)

    def test_composite_loss_with_pairwise_and_composite_loss(self):
        """Graph distance is 1 which means that the items have neighbors one hop away"""
        graph_distance = 1
        item_distances = np.array([[graph_distance, graph_distance],
                                   [graph_distance, graph_distance]])
        score_pos = 0
        score_neg = -1

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 0]], dtype=tf.int64)

        loss = CompositeLoss(self.n_users, self.n_items, self.flags, item_distances=item_distances)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 2.5)
