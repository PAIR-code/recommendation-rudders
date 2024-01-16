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
from collections import namedtuple
from unittest.mock import MagicMock
from rudders.models import TransE
from rudders.utils import set_seed
from rudders.losses import BCELoss, HingeLoss


def get_flags(initializer='RandomUniform', regularizer='l2', dims=32, neg_sample_size=1,
              entity_reg=0, relation_reg=0, batch_size=10, hinge_margin=1):

    Flags = namedtuple("Flags", ['initializer', 'regularizer', 'dims', 'neg_sample_size', 'entity_reg', 'relation_reg',
                                 'batch_size', 'hinge_margin'])
    return Flags(
        initializer=initializer,
        regularizer=regularizer,
        dims=dims,
        neg_sample_size=neg_sample_size,
        entity_reg=entity_reg,
        relation_reg=relation_reg,
        batch_size=batch_size,
        hinge_margin=hinge_margin
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
        return TransE(n_users + n_items, self.n_relations, self.item_ids, self.flags)

    def test_positive_sample_with_high_score_and_negative_sample_with_low_score_result_low_bce_loss(self):
        score_pos = 50
        score_neg = -50

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = BCELoss(ini_neg_index=0, end_neg_index=self.n_users + self.n_items - 1, args=self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertLess(result.numpy().item(), 0.0001)

    def test_positive_sample_with_low_score_and_negative_sample_with_high_score_result_high_bce_loss(self):
        score_pos = -50
        score_neg = 50

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = BCELoss(ini_neg_index=0, end_neg_index=self.n_users + self.n_items - 1, args=self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 10)

    def test_positive_sample_with_high_score_and_negative_sample_with_low_score_result_low_hinge_loss(self):
        score_pos = 50
        score_neg = -50

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = HingeLoss(ini_neg_index=0, end_neg_index=self.n_users + self.n_items - 1, args=self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertLess(result.numpy().item(), 0.0001)

    def test_positive_sample_with_low_score_and_negative_sample_with_high_score_result_high_hinge_loss(self):
        score_pos = -50
        score_neg = 50

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = HingeLoss(ini_neg_index=0, end_neg_index=self.n_users + self.n_items - 1, args=self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 10)

    def test_zero_score_result_bce_loss(self):
        score_pos = 0
        score_neg = 0

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = BCELoss(ini_neg_index=0, end_neg_index=self.n_users + self.n_items - 1, args=self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 0.5)

    def test_equal_positive_score_results_high_bce_loss(self):
        score_pos = 5
        score_neg = 5

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = BCELoss(ini_neg_index=0, end_neg_index=self.n_users + self.n_items - 1, args=self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 1)

    def test_equal_negative_score_results_high_bce_loss(self):
        score_pos = -5
        score_neg = -5

        def effect(*args, **kwargs):
            # first call inside loss is with positive samples, second with negative
            yield tf.convert_to_tensor([score_pos], dtype=self.dtype)
            yield tf.convert_to_tensor([score_neg], dtype=self.dtype)

        model = self.get_model(self.n_users, self.n_items)
        model.call = MagicMock(side_effect=effect())
        input_batch = tf.convert_to_tensor([[0, 1]], dtype=tf.int64)
        loss = BCELoss(ini_neg_index=0, end_neg_index=self.n_users + self.n_items - 1, args=self.flags)

        result = loss.calculate_loss(model, input_batch)

        self.assertGreater(result.numpy().item(), 1)
