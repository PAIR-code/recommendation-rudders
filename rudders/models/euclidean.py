from abc import ABC
import tensorflow as tf
from rudders.models.base import CFModel


class BaseEuclidean(CFModel, ABC):
    """Base model class for Euclidean embeddings."""

    def get_users(self, input_tensor):
        return self.user(input_tensor[:, 0])

    def get_all_users(self):
        return self.user.embeddings

    def get_items(self, input_tensor):
        return self.item(input_tensor[:, 1])

    def get_all_items(self):
        return self.item.embeddings


class SMFactor(BaseEuclidean):
    """Simple Matrix Factorization model."""

    def score(self, user_embeds, item_embeds, all_pairs):
        """Score based on dot product"""
        user_embeds = tf.linalg.normalize(user_embeds, axis=-1)[0]
        item_embeds = tf.linalg.normalize(item_embeds, axis=-1)[0]
        if all_pairs:
            score = tf.matmul(user_embeds, tf.transpose(item_embeds))
        else:
            score = tf.reduce_sum(user_embeds * item_embeds, axis=-1, keepdims=True)
        return score


class DistEuclidean(BaseEuclidean):
    """Simple Collaborative Metric Learning model."""

    def score(self, user_embeds, item_embeds, all_pairs):
        """Score based on squared euclidean distance"""
        return -euclidean_sq_distance(user_embeds, item_embeds, all_pairs)


def euclidean_sq_distance(x, y, all_pairs=False):
    """Computes Euclidean squared distance.

    Args:
      x: Tensor of size B1 x d
      y: Tensor of size (B1 x) B2 x d if rhs_dep_lhs = False (True)
      all_pairs: boolean indicating whether to compute all pairwise distances or not. If eval_mode=False, must
      have B1=B2.

    Returns:
      Tensor of size B1 x B2 if eval_mode=True, otherwise Tensor of size B1 x 1.
    """
    x2 = tf.math.reduce_sum(x * x, axis=-1, keepdims=True)
    y2 = tf.math.reduce_sum(y * y, axis=-1, keepdims=True)
    if all_pairs:
        y2 = tf.transpose(y2)
        xy = tf.linalg.matmul(x, y, transpose_b=True)
    else:
        xy = tf.math.reduce_sum(x * y, axis=-1, keepdims=True)
    return x2 + y2 - 2 * xy
