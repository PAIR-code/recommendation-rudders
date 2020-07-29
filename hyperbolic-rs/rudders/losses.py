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

    def __init__(self, n_users, n_items, args, **kwargs):
        """Initialize CF loss function.

        Args:
          sizes: Tuple of size 2 containing (n_users, n_items).
          neg_sample_size: Integer indicating the number of negative samples to use.
          double_neg: Bool indicating whether or not to use double negative sampling.
          margin: Float indicating the margin between a score for positive and negative examples.
        """
        self.n_users = n_users
        self.n_items = n_items
        self.neg_sample_size = args.neg_sample_size
        self.margin = tf.Variable(args.margin * tf.keras.backend.ones(1), trainable=False)

    @abc.abstractmethod
    def calculate_loss(self, model, input_batch):
        """
        Args:
          model: tf.keras.Model CF embedding model.
          input_batch: Tensor of size batch_size x 2 containing input pairs.

        Returns:
          Average loss within the input_batch.
        """
        pass


class AbstractPairwiseHingeLoss(LossFunction, abc.ABC):
    """Pairwise ranking hinge loss."""

    def __init__(self, n_users, n_items, args, **kwargs):
        super().__init__(n_users, n_items, args)
        self.bce = tf.keras.losses.BinaryCrossentropy(from_logits=True)
        self.gamma = tf.Variable(tf.keras.backend.ones(1), trainable=False)

    def calculate_loss(self, model, input_batch):
        dist_to_pos = self.call_model(model, input_batch)
        loss = self.bce(tf.ones_like(dist_to_pos), dist_to_pos)
        for _ in range(self.neg_sample_size):
            neg_idx = self.get_negative_sample_ids(input_batch)
            # creates a new batch of neg_items and the same users
            neg_input_batch = tf.concat((tf.expand_dims(input_batch[:, 0], 1), neg_idx), axis=1)
            dist_to_neg = self.call_model(model, neg_input_batch)
            loss = loss + self.bce(tf.zeros_like(dist_to_neg), dist_to_neg)
        return loss

    @abc.abstractmethod
    def call_model(self, model, input_batch):
        """Ask some score from the model. A different one depending on each loss"""
        pass

    def get_negative_sample_ids(self, input_batch):
        return tf.random.uniform((len(input_batch), 1), minval=0, maxval=self.n_items, dtype=input_batch.dtype)


class PairwiseHingeLoss(AbstractPairwiseHingeLoss):
    """Pairwise ranking hinge loss."""
    def call_model(self, model, input_batch):
        return model(input_batch)


class UserItemHingeLoss(AbstractPairwiseHingeLoss):
    def call_model(self, model, input_batch):
        return model.get_user_item_score(input_batch)


class ItemUserHingeLoss(AbstractPairwiseHingeLoss):
    def __init__(self, n_users, n_items, args, **kwargs):
        super().__init__(n_users, n_items, args)
        self.n_items = n_users

    def call_model(self, model, input_batch):
        return model.get_item_user_score(input_batch)

    def calculate_loss(self, model, input_batch):
        dist_to_pos = self.call_model(model, input_batch)
        loss = self.bce(tf.ones_like(dist_to_pos), dist_to_pos)
        for _ in range(self.neg_sample_size):
            neg_idx = self.get_negative_sample_ids(input_batch)
            # creates a new batch of neg_users and the same items
            neg_input_batch = tf.concat((neg_idx, tf.expand_dims(input_batch[:, 1], 1)), axis=1)
            dist_to_neg = self.call_model(model, neg_input_batch)
            loss = loss + self.bce(tf.zeros_like(dist_to_neg), dist_to_neg)
        return loss


class ItemItemHingeLoss(LossFunction):
    def __init__(self, n_users, n_items, args, **kwargs):
        super().__init__(n_users, n_items, args)
        self.item_distances = tf.keras.backend.constant(kwargs["item_distances"])
        # Keep small proportion of closest neighbors of each item to compute loss only over those
        # First set unreachable nodes to a large distance, then it looks for the indexes of min_k
        # (top_k of -distances) to use them in the loss calculation
        valid_item_dists = tf.where(self.item_distances > 0, self.item_distances, tf.keras.backend.ones(1) * 1000)
        neighs_ids = tf.math.top_k(-valid_item_dists, k=int(len(self.item_distances) * args.neighbors))[1]
        self.neighbor_ids = tf.cast(neighs_ids, tf.int64)
        self.gamma = tf.Variable(args.semantic_gamma * tf.keras.backend.ones(1), trainable=False)
        self.neg_sample_size = args.distortion_neg_sample_size
        self.bce = tf.keras.losses.BinaryCrossentropy(from_logits=False)

    def calculate_loss(self, model, input_batch):
        item_ids = tf.expand_dims(input_batch[:, 1], 1)
        dst_index = self.get_negative_sample_ids(input_batch)
        item_item_input_batch = tf.concat((item_ids, dst_index), axis=1)

        space_distance = tf.keras.activations.sigmoid(model.get_item_item_score(item_item_input_batch))
        graph_distance = tf.expand_dims(tf.gather_nd(self.item_distances, item_item_input_batch), 1)

        space_distance = tf.where(graph_distance > 0, space_distance, tf.ones_like(space_distance))

        return self.bce(tf.ones_like(space_distance), space_distance)

    def get_negative_sample_ids(self, input_batch):
        src_index = tf.expand_dims(input_batch[:, 1], 1)
        neighbor_index_dst = tf.random.uniform((len(src_index), 1), minval=0, maxval=self.neighbor_ids.shape[-1],
                                               dtype=src_index.dtype)
        neighbor_index = tf.concat((tf.expand_dims(src_index, 1), neighbor_index_dst), axis=1)
        return tf.gather_nd(self.neighbor_ids, neighbor_index)


class SemanticLoss(LossFunction):
    def __init__(self, n_users, n_items, args, **kwargs):
        super(SemanticLoss, self).__init__(n_users, n_items, args)
        self.item_distances = tf.keras.backend.constant(kwargs["item_distances"])
        # Keep small proportion of closest neighbors of each item to compute loss only over those
        # First set unreachable nodes to a large distance, then it looks for the indexes of min_k
        # (top_k of -distances) to use them in the loss calculation
        valid_item_dists = tf.where(self.item_distances > 0, self.item_distances, tf.keras.backend.ones(1) * 1000)
        neighs_ids = tf.math.top_k(-valid_item_dists, k=int(len(self.item_distances) * args.neighbors))[1]
        self.neighbor_ids = tf.cast(neighs_ids, tf.int64)
        self.gamma = tf.Variable(args.semantic_gamma * tf.keras.backend.ones(1), trainable=False)
        self.distortion_neg_sample_size = args.distortion_neg_sample_size

    def calculate_loss(self, model, input_batch):
        loss = tf.keras.backend.constant(0.0)
        src_index = input_batch[:, 1]
        src_item_embeds = model.get_items(src_index)
        for _ in range(self.distortion_neg_sample_size):
            dst_index = self.get_dst_index(src_index)
            dst_item_embeds = model.get_items(dst_index)
            indexes = tf.concat((tf.expand_dims(src_index, 1), tf.expand_dims(dst_index, 1)), axis=1)

            space_distance = model.distance(src_item_embeds, dst_item_embeds, all_pairs=False)
            graph_distance = tf.expand_dims(tf.gather_nd(self.item_distances, indexes), 1)

            space_distance = tf.where(graph_distance > 0, space_distance, tf.zeros_like(space_distance))
            graph_distance = tf.where(graph_distance > 0, graph_distance, tf.ones_like(graph_distance))

            this_loss = tf.math.exp(tf.pow(space_distance, 2) / graph_distance) - 1
            loss = loss + tf.reduce_mean(this_loss)
        return loss

    def get_dst_index(self, src_index):
        neighbor_index_dst = tf.random.uniform((len(src_index), 1), minval=0, maxval=self.neighbor_ids.shape[-1],
                                               dtype=src_index.dtype)
        neighbor_index = tf.concat((tf.expand_dims(src_index, 1), neighbor_index_dst), axis=1)
        return tf.gather_nd(self.neighbor_ids, neighbor_index)


class DistortionLoss(LossFunction):
    """This loss can only be used with DistanceDistortionHyperbolic since the model needs to implement
        the 'distortion' method"""

    def __init__(self, n_users, n_items, args, **kwargs):
        super(DistortionLoss, self).__init__(n_users, n_items, args)
        self.gamma = tf.Variable(args.distortion_gamma * tf.keras.backend.ones(1), trainable=False)

    def calculate_loss(self, model, input_batch):
        distortion = model.distortion(input_batch, all_pairs=False)
        for i in range(self.neg_sample_size):
            neg_idx = tf.random.uniform((len(input_batch), 1), minval=0, maxval=self.n_items, dtype=input_batch.dtype)
            neg_input_batch = tf.concat((tf.expand_dims(input_batch[:, 0], 1), neg_idx), axis=1)
            distortion = distortion + model.distortion(neg_input_batch, all_pairs=False)

        distortion_loss = tf.reduce_mean(distortion)
        return distortion_loss


class CompositeLoss(LossFunction):
    """This class allows to compose a loss function made of different loss functions, resulting in a
    multi-task loss with different criteria."""

    def __init__(self, n_users, n_items, args, **kwargs):
        super(CompositeLoss, self).__init__(n_users, n_items, args)
        self.losses = [PairwiseHingeLoss(n_users, n_items, args)]
        if args.distortion_gamma > 0:
            self.losses.append(DistortionLoss(n_users, n_items, args))
        if args.semantic_gamma > 0:
            self.losses.append(SemanticLoss(n_users, n_items, args, **kwargs))

    def calculate_loss(self, model, input_batch):
        loss = tf.keras.backend.constant(0.0)
        for loss_fn in self.losses:
            loss = loss + loss_fn.gamma * loss_fn.calculate_loss(model, input_batch)
        return loss


class MultiRelCompositeLoss(LossFunction):
    """This class allows to compose a loss function made of different loss functions, resulting in a
    multi-task loss with different criteria."""

    def __init__(self, n_users, n_items, args, **kwargs):
        super().__init__(n_users, n_items, args)
        self.losses = [UserItemHingeLoss(n_users, n_items, args), ItemUserHingeLoss(n_users, n_items, args)]
        if args.semantic_gamma > 0:
            self.losses.append(ItemItemHingeLoss(n_users, n_items, args, **kwargs))

    def calculate_loss(self, model, input_batch):
        loss = tf.keras.backend.constant(0.0)
        for loss_fn in self.losses:
            loss = loss + loss_fn.gamma * loss_fn.calculate_loss(model, input_batch)
        return loss