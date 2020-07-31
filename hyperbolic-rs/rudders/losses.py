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
from rudders.models import Relations


class LossFunction(abc.ABC):
    """Abstract loss function for CF embeddings."""

    @abc.abstractmethod
    def calculate_loss(self, model, input_batch):
        """
        :param model: CF embedding model.
        :param input_batch: Tensor of size batch_size x 2 containing input pairs.
        :return: Average loss within the input_batch.
        """
        pass


class BCEwithNegativeSampleLoss(LossFunction, abc.ABC):
    """Abstract BCE loss with negative sampling."""

    def __init__(self, head_index, tail_index, relation_id, ini_neg_index, end_neg_index, args):
        super().__init__()
        self.head_index = head_index
        self.tail_index = tail_index
        self.relation_id = relation_id
        self.relation_tensor = tf.constant(self.relation_id.value, shape=(args.batch_size, 1), dtype=tf.int64)
        self.ini_neg_index = ini_neg_index
        self.end_neg_index = end_neg_index
        self.neg_sample_size = args.neg_sample_size
        self.bce = tf.keras.losses.BinaryCrossentropy(from_logits=True)
        self.gamma = tf.Variable(args.gamma * tf.keras.backend.ones(1), trainable=False)

    def calculate_loss(self, model, input_batch):
        triple_input_batch = self.build_positive_input_batch(input_batch)
        score_to_pos = model(triple_input_batch)
        loss = self.bce(tf.ones_like(score_to_pos), score_to_pos)
        for _ in range(self.neg_sample_size):
            neg_triple_input_batch = self.build_negative_input_batch(input_batch)
            score_to_neg = model(neg_triple_input_batch)
            loss = loss + self.bce(tf.zeros_like(score_to_neg), score_to_neg)
        return loss

    def build_positive_input_batch(self, input_batch):
        """From a batch x 2 input_batch tensor with (head, tail) builds a batch x 3 input batch of the form
        (head, relation, tail)"""
        relation = self.relation_tensor[:len(input_batch)]
        head = tf.expand_dims(input_batch[:, self.head_index], 1)
        tail = tf.expand_dims(input_batch[:, self.tail_index], 1)
        return tf.concat((head, relation, tail), axis=-1)

    def build_negative_input_batch(self, input_batch):
        """From a batch x 2 input_batch tensor with (head, tail) builds a batch x 3 input batch of the form
        (head, relation, corrupted_tail)"""
        relation = self.relation_tensor[:len(input_batch)]
        head = tf.expand_dims(input_batch[:, self.head_index], 1)
        corrupted_tail = tf.random.uniform((len(input_batch), 1),
                                           minval=self.ini_neg_index,
                                           maxval=self.end_neg_index,
                                           dtype=input_batch.dtype)
        return tf.concat((head, relation, corrupted_tail), axis=-1)


class UserItemBCELoss(BCEwithNegativeSampleLoss):
    def __init__(self, n_users, n_items, args, **kwargs):
        # sets ini and end neg_indexes such that the negative samples are going to be items
        ini_item = 0
        end_item = n_items - 1
        super().__init__(head_index=0, tail_index=1, relation_id=Relations.USER_ITEM,
                         ini_neg_index=ini_item, end_neg_index=end_item, args=args)


class ItemUserBCELoss(BCEwithNegativeSampleLoss):
    def __init__(self, n_users, n_items, args, **kwargs):
        # sets ini and end neg_indexes such that the negative samples are going to be users
        ini_user = n_items
        end_user = n_items + n_users - 1
        super().__init__(head_index=1, tail_index=0, relation_id=Relations.ITEM_USER,
                         ini_neg_index=ini_user, end_neg_index=end_user, args=args)


class ItemItemBCELoss(LossFunction):
    def __init__(self, n_users, n_items, args, **kwargs):
        super().__init__()
        self.item_distances = tf.keras.backend.constant(kwargs["item_distances"])
        # Keep small proportion of closest neighbors of each item to compute loss only over those
        # First set unreachable nodes to a large distance, then it looks for the indexes of min_k
        # (top_k of -distances) to use them in the loss calculation
        valid_item_dists = tf.where(self.item_distances > 0, self.item_distances, tf.keras.backend.ones(1) * 1e6)
        neighs_ids = tf.math.top_k(-valid_item_dists, k=int(len(self.item_distances) * args.neighbors))[1]
        self.neighbor_ids = tf.cast(neighs_ids, tf.int64)
        self.gamma = tf.Variable(args.semantic_gamma * tf.keras.backend.ones(1), trainable=False)
        self.pos_sample_size = args.semantic_pos_sample_size
        self.semantic_graph_weight = args.semantic_graph_weight
        self.relation_tensor = tf.constant(Relations.ITEM_ITEM.value, shape=(args.batch_size, 1), dtype=tf.int64)
        self.bce = tf.keras.losses.BinaryCrossentropy(from_logits=False)

    def calculate_loss(self, model, input_batch):
        loss = tf.keras.backend.constant(0.0)
        for _ in range(self.pos_sample_size):
            inverse_item_item_input_batch, item_item_input_batch = self.build_item_item_input(input_batch)
            for item_item_batch in [item_item_input_batch, inverse_item_item_input_batch]:
                model_score = model(item_item_batch)
                # gets graph distance
                item_src, item_dst = tf.expand_dims(item_item_batch[:, 0], 1), tf.expand_dims(item_item_batch[:, -1], 1)
                item_item_ids = tf.concat((item_src, item_dst), axis=-1)
                graph_distance = tf.expand_dims(tf.gather_nd(self.item_distances, item_item_ids), 1)
                # It adds graph distance so it penalizes less the items far apart in the graph
                weighted_logits = model_score + graph_distance / self.semantic_graph_weight
                prob = tf.keras.activations.sigmoid(weighted_logits)

                prob = tf.where(graph_distance > 0, prob, tf.ones_like(model_score))
                loss = loss + self.bce(tf.ones_like(prob), prob)
        return loss

    def build_item_item_input(self, input_batch):
        """
        Builds item item pairs with neighbor items
        :param input_batch: is a batch x 2 tensor of (user, item) pairs.
        :return: tensors of batch x 3 with (item, relation, neighbor_item) and (neighbor_item, relation, item)
        """
        item_ids = tf.expand_dims(input_batch[:, -1], 1)
        dst_index = self.get_neighbors_ids(item_ids)
        relation = self.relation_tensor[:len(input_batch)]
        item_item_input_batch = tf.concat((item_ids, relation, dst_index), axis=1)
        inverse_item_item_input_batch = tf.concat((dst_index, relation, item_ids), axis=1)
        return inverse_item_item_input_batch, item_item_input_batch

    def get_neighbors_ids(self, src_index):
        neighbor_index_dst = tf.random.uniform((len(src_index), 1), minval=0, maxval=self.neighbor_ids.shape[-1],
                                               dtype=src_index.dtype)
        neighbor_index = tf.concat((src_index, neighbor_index_dst), axis=1)
        return tf.expand_dims(tf.gather_nd(self.neighbor_ids, neighbor_index), 1)


class CompositeLoss(LossFunction):
    """This class allows to compose a loss function made of different loss functions, resulting in a
    multi-task loss with different criteria."""

    def __init__(self, n_users, n_items, args, **kwargs):
        super().__init__()
        self.losses = [UserItemBCELoss(n_users, n_items, args), ItemUserBCELoss(n_users, n_items, args)]
        if args.semantic_gamma > 0:
            self.losses.append(ItemItemBCELoss(n_users, n_items, args, **kwargs))

    def calculate_loss(self, model, input_batch):
        loss = tf.keras.backend.constant(0.0)
        for loss_fn in self.losses:
            loss = loss + loss_fn.gamma * loss_fn.calculate_loss(model, input_batch)
        return loss
