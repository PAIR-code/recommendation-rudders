from abc import ABC
import tensorflow as tf
from rudders.models.base import CFModel
from rudders import hmath


class BaseHyperbolic(CFModel, ABC):
    """Base model class for hyperbolic embeddings with parameters defined in tangent space."""

    def __init__(self, n_users, n_items, args):
        super(BaseHyperbolic, self).__init__(n_users, n_items, args)
        # inits c to a value that will result in softplus(c) == curvature
        init_value = tf.math.log(tf.math.exp(tf.keras.backend.constant(args.curvature)) - 1)
        self.c = tf.Variable(initial_value=init_value, trainable=args.train_c)

    def get_users(self, indexes):
        return hmath.expmap0(self.user(indexes), self.get_c())

    def get_all_users(self):
        return hmath.expmap0(self.user.embeddings, self.get_c())

    def get_items(self, indexes):
        return hmath.expmap0(self.item(indexes), self.get_c())

    def get_all_items(self):
        return hmath.expmap0(self.item.embeddings, self.get_c())

    def get_c(self):
        return tf.math.softplus(self.c)

    def distance(self, embeds_a, embeds_b, all_pairs):
        c = self.get_c()
        if all_pairs:
            return hmath.hyp_distance_all_pairs(embeds_a, embeds_b, c)
        return hmath.hyp_distance(embeds_a, embeds_b, c)


class DistHyperbolic(BaseHyperbolic):
    def score(self, user_embeds, item_embeds, all_pairs):
        """Score based on square hyperbolic distance"""
        return -self.distance(user_embeds, item_embeds, all_pairs)**2
