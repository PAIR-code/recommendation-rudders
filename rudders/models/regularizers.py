
import abc
import tensorflow as tf


class CFRegularizer(tf.keras.regularizers.Regularizer, abc.ABC):
    """CF embedding regularizers."""

    def __init__(self, reg_weight):
        """Initializes CF embedding regularizer.

        Args:
          reg_weight: regularization weight
        """
        super(CFRegularizer, self).__init__()
        self.reg_weight = tf.keras.backend.cast_to_floatx(reg_weight)

    def __call__(self, x):
        """Compute regularization for input embeddings.

        :params: x: Tensor of size batch_size x embedding_dimension to regularize.
        """
        if not self.reg_weight:
            return tf.keras.backend.constant(0.)
        return self.reg_weight * self.compute_norm(x)

    @abc.abstractmethod
    def compute_norm(self, x):
        """Computes embeddings' norms for regularization."""
        pass

    def get_config(self):
        return {'reg_weight': float(self.reg_weight)}


class NoRegularizer(CFRegularizer):

    def __call__(self, x):
        return tf.keras.backend.constant(0.)

    def get_config(self):
        return {'reg_weight': 0}


class L1Regularizer(CFRegularizer):
    def compute_norm(self, x):
        return tf.reduce_sum(tf.abs(x))


class L2Regularizer(CFRegularizer):
    def compute_norm(self, x):
        return tf.reduce_sum(tf.square(x))


class L3Regularizer(CFRegularizer):
    def compute_norm(self, x):
        return tf.reduce_sum(tf.abs(x) ** 3)


class N2Regularizer(CFRegularizer):
    """Nuclear 2-norm regularization."""
    def compute_norm(self, x):
        return tf.reduce_sum(tf.norm(x, ord=2, axis=1) ** 3)
