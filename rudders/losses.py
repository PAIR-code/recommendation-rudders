"""Loss functions for CF with support for optional negative sampling."""

import abc
import tensorflow as tf


class LossFunction(abc.ABC):
    """Abstract loss function for CF embeddings."""

    def __init__(self, n_users, n_items, args):
        """Initialize CF loss function.

        Args:
          sizes: Tuple of size 2 containing (n_users, n_items).
          neg_sample_size: Integer indicating the number of negative samples to use.
          double_neg: Bool indicating whether or not to use double negative
            sampling.
          margin: Float indicating the margin between ascore for positive and
            negative examples.
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
