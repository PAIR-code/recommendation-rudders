from abc import ABC
import tensorflow as tf
from rudders.models.base import CFModel
from rudders import hmath


class BaseHyperbolic(CFModel, ABC):
    """Base model class for hyperbolic embeddings with parameters defined in tangent space."""

    def __init__(self, n_users, n_items, args):
        super(BaseHyperbolic, self).__init__(n_users, n_items, args)
        # inits c to a value that will result in softplus(c) == 1
        self.c = tf.Variable(initial_value=tf.math.log(tf.math.exp(tf.keras.backend.ones(1)) - 1), trainable=args.train_c)

    def get_users(self, input_tensor):
        return hmath.expmap0(self.user(input_tensor[:, 0]), self.get_c())

    def get_all_users(self):
        return hmath.expmap0(self.user.embeddings, self.get_c())

    def get_items(self, input_tensor):
        return hmath.expmap0(self.item(input_tensor[:, 1]), self.get_c())

    def get_all_items(self):
        return hmath.expmap0(self.item.embeddings, self.get_c())

    def get_c(self):
        return tf.math.softplus(self.c)


class DistHyperbolic(BaseHyperbolic):

    def score(self, user_embeds, item_embeds, all_pairs):
        """Score based on square hyperbolic distance"""
        c = self.get_c()
        if all_pairs:
            return -hmath.hyp_distance_all_pairs(user_embeds, item_embeds, c) ** 2
        return -hmath.hyp_distance(user_embeds, item_embeds, c) ** 2
