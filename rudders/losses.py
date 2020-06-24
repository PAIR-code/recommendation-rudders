"""Loss functions for CF with support for optional negative sampling."""

import abc
import tensorflow as tf


class LossFunction(abc.ABC):
    """Abstract loss function for CF embeddings."""

    def __init__(self, sizes, args):
        """Initialize CF loss function.

        Args:
          sizes: Tuple of size 2 containing (n_users, n_items).
          neg_sample_size: Integer indicating the number of negative samples to use.
          double_neg: Bool indicating whether or not to use double negative sampling.
          margin: Float indicating the margin between a score for positive and negative examples.
        """
        self.n_users = sizes[0]
        self.n_items = sizes[1]
        self.neg_sample_size = args.neg_sample_size
        self.double_neg = args.double_neg
        self.use_neg_sampling = args.neg_sample_size > 0
        self.gamma = tf.Variable(args.gamma * tf.keras.backend.ones(1), trainable=False)
        self.margin = tf.Variable(args.margin * tf.keras.backend.ones(1), trainable=False)

    @abc.abstractmethod
    def loss_from_logits(self, logits, full_labels, labels):
        """Computes CF loss.

        Args:
          logits: Tensor of size batch_size x n_items containing predictions.
          full_labels: Tensor of size batch_size x n_items containing one-hot
            labels.
          labels: Tensor of size batch_size x 1 containing sparse labels (index of
            correct item).

        Returns:
          Average loss within batch.
        """
        pass

    @abc.abstractmethod
    def get_neg_sample_mask(self, logits, full_labels):
        """Generates negative sampling mask.

        Args:
          logits: Tensor of size batch_size x n_items containing predictions.
          full_labels: Tensor of size batch_size x n_items containing one-hot
            labels.

        Returns:
          neg_sample_mask: Tensor of size batch_size x n_items.
        """
        pass

    @abc.abstractmethod
    def calculate_loss(self, model, input_batch):
        """Computes loss with or without negative sampling.

        Args:
          model: tf.keras.Model CF embedding model.
          input_batch: Tensor of size batch_size x 2 containing input pairs.

        Returns:
          Average loss within the input_batch.
        """
        pass


class ExpLossFunction(LossFunction):
    """Exponent based losses."""

    def get_neg_sample_mask(self, logits, full_labels):
        """Generates negative sampling mask on logits for exp-based losses.

        Args:
          logits: Tensor of size batch_size x n_items containing predictions.
          full_labels: Tensor of size batch_size x n_items containing one-hot
            labels.

        Returns:
          neg_sample_mask: Tensor of size batch_size x n_items with -1e6 and
                           zeros (-1e6 indicates that the corresonding example
                           is masked).
        """
        neg_sample_mask = tf.random.uniform(tf.shape(logits), dtype=logits.dtype)
        neg_sample_mask = tf.cast(neg_sample_mask > self.gamma, logits.dtype)
        neg_sample_mask = -1e6 * tf.maximum(neg_sample_mask - full_labels, 0)
        return neg_sample_mask

    def calculate_loss(self, model, input_batch):
        labels = input_batch[:, 1]
        logits = model(input_batch, eval_mode=True)
        full_labels = tf.one_hot(labels, depth=self.n_items, dtype=logits.dtype)
        if self.use_neg_sampling:
            # mask some values for negative sampling
            neg_sample_mask = self.get_neg_sample_mask(logits, full_labels)
            # mask logits to only keep target and negative examples' scores
            logits = logits + neg_sample_mask
        return self.loss_from_logits(logits, full_labels, labels)


class SigmoidCrossEntropy(ExpLossFunction):
    """Sigmoid cross entropy loss."""

    def loss_from_logits(self, logits, full_labels, labels):
        return tf.reduce_mean(
            tf.nn.sigmoid_cross_entropy_with_logits(full_labels, logits))


class SoftmaxCrossEntropy(ExpLossFunction):
    """Softmax cross entropy loss."""

    def loss_from_logits(self, logits, full_labels, labels):
        return tf.reduce_mean(
            tf.nn.sparse_softmax_cross_entropy_with_logits(labels, logits))


class PairwiseHingeLoss(LossFunction):
    """Pairwise ranking hinge loss."""

    def get_neg_sample_mask(self, logits, full_labels):
        """Generates negative sampling mask.

        Args:
          logits: Tensor of size batch_size x n_items containing predictions.
          full_labels: Tensor of size batch_size x n_items containing one-hot
            labels.

        Returns:
          neg_sample_mask: Tensor of size batch_size x n_items with ones and
                           zeros (zero indicates that the corresonding example
                           is masked).
        """
        neg_mask = tf.zeros_like(logits)
        n_users, n_items = tf.shape(logits)
        for i in range(self.neg_sample_size):
            idx = tf.random.uniform((n_users,), minval=0, maxval=n_items, dtype=tf.dtypes.int32)
            current_mask = tf.one_hot(idx, depth=n_items, dtype=logits.dtype)
            neg_mask = tf.maximum(neg_mask, current_mask)

        neg_mask = tf.maximum(neg_mask, full_labels)        # "OR" operator
        return neg_mask

    def loss_from_logits(self, logits, full_labels, labels):
        # "positive sample" becomes positive, "neg sample" remains negative
        signed_logits = (1.0 - 2.0 * full_labels) * logits
        return tf.reduce_mean(tf.nn.relu(self.margin + tf.reduce_sum(signed_logits, 1)))

    def calculate_loss(self, model, input_batch):
        labels = input_batch[:, 1]
        logits = model(input_batch, all_pairs=True)
        full_labels = tf.one_hot(labels, depth=self.n_items, dtype=logits.dtype)
        if self.use_neg_sampling:
            neg_sample_mask = self.get_neg_sample_mask(logits, full_labels)
            logits = logits * neg_sample_mask       # mask logits to only keep target and negative examples' scores
        return self.loss_from_logits(logits, full_labels, labels)


class HingeDistortionLoss(PairwiseHingeLoss):

    def calculate_loss(self, model, input_batch):
        labels = input_batch[:, 1]
        logits = model(input_batch, all_pairs=True)
        distortion = model.distortion(input_batch, all_pairs=True)
        full_labels = tf.one_hot(labels, depth=self.n_items, dtype=logits.dtype)
        if self.use_neg_sampling:
            neg_sample_mask = self.get_neg_sample_mask(logits, full_labels)
            logits = logits * neg_sample_mask       # mask logits to only keep target and negative examples' scores
            distortion = distortion * neg_sample_mask
        hinge_loss = self.loss_from_logits(logits, full_labels, labels)
        distortion_loss = tf.reduce_mean(tf.reduce_sum(distortion, axis=1))
        return hinge_loss + self.gamma * distortion_loss
