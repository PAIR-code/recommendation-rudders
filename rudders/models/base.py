
import abc
import numpy as np
import tensorflow as tf

from rudders.models import regularizers


class CFModel(tf.keras.Model, abc.ABC):
    """Abstract CF embedding model class.

    Module to define basic operations in CF embedding models, including embedding
    initialization, computing embeddings and pairs' scores.
    Attributes:
      dims: Integer, embeddings dimension.
      initializer: tf.keras.initializers class indicating which initializer to use.
      item_regularizer: tf.keras.regularizers.Regularizer for item embeddings.
      user_regularizer: tf.keras.regularizers.Regularizer for user embeddings.
      user: Tensorflow tf.keras.layers.Embedding class, holding user embeddings.
      item: Tensorflow tf.keras.layers.Embedding class, holding item embeddings.
      gamma: non trainable tf.Variable representing the margin for distance-based losses.
    """

    def __init__(self, n_users, n_items, args):
        super(CFModel, self).__init__()
        self.dims = args.dims
        self.initializer = tf.keras.initializers.RandomUniform(minval=-0.01, maxval=0.01)   #getattr(tf.keras.initializers, args.initializer)
        self.item_regularizer = getattr(regularizers, args.regularizer)(args.item_reg)
        self.user_regularizer = getattr(regularizers, args.regularizer)(args.user_reg)
        self.user = tf.keras.layers.Embedding(
            input_dim=n_users,
            output_dim=self.dims,
            embeddings_initializer=self.initializer,
            embeddings_regularizer=self.user_regularizer,
            name='user_embeddings')
        self.item = tf.keras.layers.Embedding(
            input_dim=n_items,
            output_dim=self.dims,
            embeddings_initializer=self.initializer,
            embeddings_regularizer=self.item_regularizer,
            name='item_embeddings')
        self.gamma = tf.Variable(initial_value=args.gamma * tf.keras.backend.ones(1), trainable=False)
        self.rhs_dep_lhs = False

    @abc.abstractmethod
    def get_users(self, input_tensor):
        """
        Args: input_tensor: Tensor of size batch_size x 2 containing users and items' indices.
        Returns: Tensor of size batch_size x embedding_dimension representing users' embeddings.
        """
        pass

    @abc.abstractmethod
    def get_all_users(self):
        """Get all user embeddings in a CF dataset.

        Returns: Tensor of size n_users x embedding_dimension representing embeddings for all users in the CF
        """
        pass

    @abc.abstractmethod
    def get_items(self, input_tensor):
        """
        Args: input_tensor: Tensor of size batch_size x 2 containing users and items' indices.
        Returns: Tensor of size batch_size x embedding_dimension representing item entities' embeddings.
        """
        pass

    @abc.abstractmethod
    def get_all_items(self):
        """Get all item embeddings in a CF dataset.

        Returns: Tensor of size n_items x embedding_dimension representing embeddings for all items in the CF
        """
        pass

    def call(self, input_tensor, all_pairs=False):
        """Forward pass of CF embedding models.

        Args:
          input_tensor: Tensor of size batch_size x 2 containing pairs' indices.
          all_pairs: boolean to indicate whether to compute scores against all
            possible item entities in the CF, or only individual pairs' scores.

        Returns:
          Tensor containing pairs scores. If eval_mode is False, this tensor has size batch_size x 1, otherwise it has
          size batch_size x n_item where n_item is the total number of items in the CF.
        """
        user_embeds = self.get_users(input_tensor)
        all_item_embeds = self.get_all_items() if all_pairs else self.get_items(input_tensor)
        predictions = self.score(user_embeds, all_item_embeds, all_pairs)
        return predictions

    @abc.abstractmethod
    def score(self, user_embeds, item_embeds, all_pairs):
        """Computes a similarity score between user and item embeddings.

        Args:
          user_embeds: Tensor of size B1 x embedding_dimension containing users' embeddings.
          item_embeds: Tensor of size (B1 x) B2 x embedding_dimension containing items' embeddings
          all_pairs: boolean to indicate whether to compute all pairs of scores or not. If False, B2 must be equal to 1.

        Returns:
          Tensor representing similarity scores. If eval_mode is False, this tensor
          has size B1 x 1, otherwise it has size B1 x B2.
        """
        pass

    def get_scores_targets(self, input_tensor):
        """Computes pairs' scores as well as scores againts all possible entities.

        Args:
          input_tensor: Tensor of size batch_size x 2 containing pairs' indices.

        Returns:
          scores: Numpy array of size batch_size x n_items containing users'
                  scores against all possible items in the CF.
          targets: Numpy array of size batch_size x 1 containing pairs' scores.
        """
        all_items = self.get_all_items()
        user_embeds = self.get_users(input_tensor)
        item_embeds = self.get_items(input_tensor)
        scores = self.score(user_embeds, all_items, all_pairs=True)
        targets = self.score(user_embeds, item_embeds, all_pairs=False)
        return scores.numpy(), targets.numpy()

    def random_eval(self, split_data, samples, batch_size=500, num_rand=100, seed=1234):
        """Compute ranking-based evaluation metrics in both full and random settings.

        Args:
          split_data: Tensor of size n_examples x 2 containing pairs' indices.
          samples: Dict representing items to skip per user for evaluation in the filtered setting.
          batch_size: batch size to use to compute scores.
          num_rand: number of negative samples to draw.
          seed: seed for random sampling.

        Returns:
        ranks: Numpy array of shape (n_examples, ) containing the rank of each
          example in full setting (ranking against the full item corpus).
        ranks_random: Numpy array of shape (n_examples, ) containing the rank of
          each example in random setting (ranking against randomly selected
          num_rand items).
        """
        total_examples = tf.data.experimental.cardinality(split_data).numpy()
        batch_size = min(batch_size, total_examples)
        ranks = np.ones(total_examples)
        ranks_random = np.ones(total_examples)
        for counter, input_tensor in enumerate(split_data.batch(batch_size)):
            # if batch_size * counter >= total_examples:
            #     break
            scores, targets = self.get_scores_targets(input_tensor)  # score: score to all; targets: score to valid/eval item
            scores_random = np.ones(shape=(scores.shape[0], num_rand))
            for i, query in enumerate(input_tensor):
                query = query.numpy()
                filter_out = samples[query[0]]
                scores[i, filter_out] = -1e6  # sets that value on scores of train items
                comp_filter_out = list(set(range(scores.shape[1])) - set(filter_out))
                np.random.seed(seed)
                random_indices = np.random.choice(comp_filter_out, num_rand, replace=False)
                scores_random[i, :] = scores[i, random_indices]  # copies the indices chosen for evaluation

            ini = counter * batch_size
            end = (counter + 1) * batch_size
            ranks[ini:end] += np.sum((scores >= targets), axis=1)
            ranks_random[ini:end] += np.sum((scores_random >= targets), axis=1)

        return ranks, ranks_random

    def get_avg_norm(self, data_name: str):
        if data_name == "user":
            return tf.reduce_mean(tf.norm(self.get_all_users(), axis=-1)).numpy()
        elif data_name == "item":
            return tf.reduce_mean(tf.norm(self.get_all_items(), axis=-1)).numpy()
        else:
            raise ValueError(f"{data_name} not present in model")
