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
"""Loss functions for CF with support for optional negative sampling."""
import abc
import tensorflow as tf


class LossFunction(abc.ABC):
    """Abstract loss function for CF embeddings."""

    @abc.abstractmethod
    def calculate_loss(self, model, input_batch):
        """
        :param model: CF embedding model.
        :param input_batch: Tensor of size batch_size x 3 containing input pairs: (head, relation, tail)
        :return: Average loss within the input_batch.
        """
        pass


class NegativeSampleLoss(LossFunction, abc.ABC):
    """Abstract loss with negative sampling.
    Input batch is always of the form (head, relation, tail).
    It will run the model with positive samples of the form: (head, relation, tail) and
    with negative samples of the form: (head, relation, corrupted_tail).
    Corrupted tails are generated by taking a uniform random sample over all the entities
    """
    def __init__(self, ini_neg_index, end_neg_index, args):
        """
        :param ini_neg_index: lower index to generate negative samples
        :param end_neg_index: higher index to generate negative samples. Pre: end_neg_index > ini_neg_index
        :param args: flags
        """
        super().__init__()
        self.ini_neg_index = ini_neg_index
        self.end_neg_index = end_neg_index
        self.neg_sample_size = args.neg_sample_size
        self.gamma = tf.Variable(args.gamma * tf.keras.backend.ones(1), trainable=False)

    def build_negative_input_batch(self, input_batch):
        """From a batch x 3 input_batch tensor with (head, relation, tail) builds a batch x 3 input batch of the form
        (head, relation, corrupted_tail)"""
        head = tf.expand_dims(input_batch[:, 0], 1)
        relation = tf.expand_dims(input_batch[:, 1], 1)
        corrupted_tail = tf.random.uniform((len(input_batch), 1),
                                           minval=self.ini_neg_index,
                                           maxval=self.end_neg_index + 1,
                                           dtype=input_batch.dtype)
        return tf.concat((head, relation, corrupted_tail), axis=-1)


class BCELoss(NegativeSampleLoss):
    """Binary Cross Entropy loss.
    The probability of the triplet being true is given by sigma(score(head, relation, tail))
    This loss aims to maximize the probability of positive samples and minimize the one of
    negative samples.
    """
    def __init__(self, ini_neg_index, end_neg_index, args):
        super().__init__(ini_neg_index, end_neg_index, args)
        self.bce = tf.keras.losses.BinaryCrossentropy(from_logits=True)

    def calculate_loss(self, model, input_batch):
        truth = tf.ones_like(input_batch[:, 0])
        for _ in range(self.neg_sample_size):
            neg_input_batch = self.build_negative_input_batch(input_batch)
            input_batch = tf.concat((input_batch, neg_input_batch), axis=0)
            truth = tf.concat((truth, tf.zeros_like(neg_input_batch[:, 0])), axis=0)

        scores = model(input_batch)
        loss = self.bce(tf.reshape(truth, (-1, 1)), scores)
        return loss


class BCESplitLoss(NegativeSampleLoss):
    """Binary Cross Entropy loss.
    The probability of the triplet being true is given by sigma(score(head, relation, tail))
    This loss aims to maximize the probability of positive samples and minimize the one of
    negative samples.
    """
    def __init__(self, ini_neg_index, end_neg_index, args):
        super().__init__(ini_neg_index, end_neg_index, args)
        self.bce = tf.keras.losses.BinaryCrossentropy(from_logits=True)

    def calculate_loss(self, model, input_batch):
        pos_score = model(input_batch)
        loss = self.bce(tf.ones_like(pos_score), pos_score)
        for _ in range(self.neg_sample_size):
            neg_input_batch = self.build_negative_input_batch(input_batch)
            neg_score = model(neg_input_batch)
            loss = loss + self.bce(tf.zeros_like(pos_score), neg_score)
        return loss


class HingeLoss(NegativeSampleLoss):
    """Hinge triple loss based on scoring positve samples higher than negative samples."""
    def __init__(self, ini_neg_index, end_neg_index, args):
        super().__init__(ini_neg_index, end_neg_index, args)
        self.margin = args.hinge_margin

    def calculate_loss(self, model, input_batch):
        pos_score = model(input_batch)
        loss = tf.keras.backend.constant(0.0)
        for _ in range(self.neg_sample_size):
            neg_input_batch = self.build_negative_input_batch(input_batch)
            neg_score = model(neg_input_batch)
            loss = loss + tf.reduce_mean(tf.nn.relu(self.margin - pos_score + neg_score))
        return loss
