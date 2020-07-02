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


class PairwiseHingeLoss(LossFunction):
    """Pairwise ranking hinge loss."""

    def calculate_loss(self, model, input_batch):
        dist_to_pos = model(input_batch, all_pairs=False)
        loss = tf.keras.backend.constant(0.0)
        for _ in range(self.neg_sample_size):
            neg_idx = tf.random.uniform((len(input_batch), 1), minval=0, maxval=self.n_items, dtype=input_batch.dtype)
            neg_input_batch = tf.concat((tf.expand_dims(input_batch[:, 0], 1), neg_idx), axis=1)
            dist_to_neg = model(neg_input_batch, all_pairs=False)
            loss = loss + self.loss_from_distances(dist_to_pos, dist_to_neg)
        return loss

    def loss_from_distances(self, dist_to_pos, dist_to_neg):
        """distances are negative. This means d = -dist(x,y)"""
        return tf.reduce_mean(tf.nn.relu(self.margin - dist_to_pos + dist_to_neg))


class SemanticLoss(PairwiseHingeLoss):
    def __init__(self, n_users, n_items, args, **kwargs):
        super(SemanticLoss, self).__init__(n_users, n_items, args)
        self.item_distances = tf.keras.backend.constant(kwargs["item_distances"])
        # Keep small proportion of closest neighbors of each item to compute loss only over those
        neighs_ids = tf.math.top_k(-self.item_distances, k=len(self.item_distances) // args.neighbors)[1]
        self.neighbor_ids = tf.cast(neighs_ids, tf.int64)
        self.distortion_gamma = tf.Variable(args.distortion_gamma * tf.keras.backend.ones(1), trainable=False)
        self.distortion_neg_sample_size = args.distortion_neg_sample_size

    def calculate_loss(self, model, input_batch):
        user_item_loss = super(SemanticLoss, self).calculate_loss(model, input_batch)
        item_item_loss = self.calculate_distortion_loss(model, input_batch)
        return user_item_loss + self.distortion_gamma * item_item_loss

    def calculate_distortion_loss(self, model, input_batch):
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

            this_loss = (space_distance / graph_distance)**2
            this_loss = tf.abs(this_loss - 1)
            loss = loss + tf.reduce_mean(this_loss)      # TODO: check tf.reduce_sum
        return loss

    def get_dst_index(self, src_index):
        neighbor_index_dst = tf.random.uniform((len(src_index), 1), minval=0, maxval=self.neighbor_ids.shape[-1],
                                               dtype=src_index.dtype)
        neighbor_index = tf.concat((tf.expand_dims(src_index, 1), neighbor_index_dst), axis=1)
        return tf.gather_nd(self.neighbor_ids, neighbor_index)

