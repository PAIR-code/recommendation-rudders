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
import abc

import numpy as np
import tensorflow as tf
from rudders.relations import Relations
from rudders.models import regularizers
from rudders.emath import apply_rotation, apply_reflection


class CFModel(tf.keras.Model, abc.ABC):
    """Abstract collaborative filtering embedding model class.
    Module to define basic operations in CF embedding models.

    This implementation is based on Knowledge Graph embeddings models, in order to model
    different types of relations between entities (users and items)
    """

    def __init__(self, n_entities, n_relations, item_ids, args, train_bias=False):
        super().__init__()
        self.dims = args.dims
        self.item_ids = np.reshape(np.array(item_ids), (-1, 1))
        self.initializer = getattr(tf.keras.initializers, args.initializer)
        self.entity_regularizer = getattr(regularizers, args.regularizer)(args.entity_reg)
        self.relation_regularizer = getattr(regularizers, args.regularizer)(args.relation_reg)
        self.entities = tf.keras.layers.Embedding(
            input_dim=n_entities,
            output_dim=self.dims,
            embeddings_initializer=self.initializer,
            embeddings_regularizer=self.entity_regularizer,
            name='entity_embeddings')
        self.relations = tf.keras.layers.Embedding(
            input_dim=n_relations,
            output_dim=self.dims,
            embeddings_initializer=self.initializer,
            embeddings_regularizer=self.relation_regularizer,
            name='relation_embeddings')

        self.bias_head = tf.keras.layers.Embedding(
            input_dim=n_entities,
            output_dim=1,
            embeddings_initializer='zeros',
            name='head_biases',
            trainable=train_bias)
        self.bias_tail = tf.keras.layers.Embedding(
            input_dim=n_entities,
            output_dim=1,
            embeddings_initializer='zeros',
            name='tail_biases',
            trainable=train_bias)

    @abc.abstractmethod
    def get_lhs(self, input_tensor):
        """
        Get left hand side embeddings, usually using head and relationship.

        :param input_tensor: Tensor of size batch_size x 3 containing (h, r, t) indices.
        :return: Tensor of size batch_size x embedding_dimension representing left hand side embeddings.
        """
        pass

    @abc.abstractmethod
    def get_rhs(self, input_tensor):
        """
        Get left hand side embeddings, usually using tail and relationship.

        :param input_tensor: Tensor of size batch_size x 3 containing (h, r, t) indices.
        :return: Tensor of size batch_size x embedding_dimension representing left hand side embeddings.
        """
        pass

    def get_all_items(self):
        """Identical to get_rhs but using all items

        :return: Tensor of size n_items x embedding_dimension representing embeddings for all items in the CF
        """
        input_tensor = np.repeat(self.item_ids, 3, axis=-1)
        input_tensor[:, 1] = Relations.USER_ITEM.value
        input_tensor = tf.convert_to_tensor(input_tensor)
        return self.get_rhs(input_tensor)

    @abc.abstractmethod
    def similarity_score(self, lhs, rhs, all_items):
        """
        Computes a similarity score between left_hand_side and right_hand_side embeddings.
          eval_mode:

        :param lhs: Tensor of size B1 x embedding_dimension containing left_hand_side embeddings.
        :param rhs: Tensor of size B2 x embedding_dimension containing right_hand_side embeddings.
        :param all_items:  boolean to indicate whether to compute all pairs of scores or not.
        If False, B1 must be equal to B2.
        :return: Tensor representing similarity scores. If all_items is False, this tensor has size B1 x 1,
        otherwise it has size B1 x B2.
        """
        pass

    def call(self, input_tensor, all_items=False):
        """
        Forward pass of Collaborative embedding models.
          
        :param input_tensor: Tensor of size batch_size x 3 containing triples' indices: (head, relation, tail) 
        :param all_items: boolean to indicate whether to compute scores against all items, or only individual
        triples' scores.
        :return: Tensor containing triple scores. If eval_mode is False, this tensor has size batch_size x 1, 
        otherwise it has size batch_size x n_items 
        """
        lhs = self.get_lhs(input_tensor)
        lhs_biases = self.bias_head(input_tensor[:, 0])
        if all_items:
            rhs = self.get_all_items()
            rhs_biases = self.bias_tail(np.reshape(self.item_ids, (-1,)))
        else:
            rhs = self.get_rhs(input_tensor)
            rhs_biases = self.bias_tail(input_tensor[:, -1])
        predictions = self.score(lhs, lhs_biases, rhs, rhs_biases, all_items)
        return predictions

    def score(self, lhs, lhs_biases, rhs, rhs_biases, all_items):
        """
        Compute triple scores using embeddings and biases.
        
        :param lhs: B1 x embedding_dim 
        :param lhs_biases: B1 x 1 
        :param rhs: B2 x embedding_dim
        :param rhs_biases: B2 x 1
        :param all_items: boolean to indicate if should compute vs all rhs or just pairs of scores. If False then
        B1 must be equal to B2 
        :return: scores: B1 x 1 if all_items is False, else B1 x B2
        """
        score = self.similarity_score(lhs, rhs, all_items)
        if all_items:
            return score + lhs_biases + tf.transpose(rhs_biases)
        return score + lhs_biases + rhs_biases

    def random_eval(self, split_data, excluded_items, samples, batch_size=500, num_rand=100, seed=1234):
        """
        Compute ranking-based evaluation metrics in both full and random settings.

        :param split_data: Dataset with tensor of size n_examples x 3 containing pairs' indices.
        :param excluded_items: List of item ids to be excluded from the evaluation
        :param samples: Dict representing items to skip per user for evaluation in the filtered setting.
        :param batch_size: batch size to use to compute scores.
        :param num_rand: number of negative samples to draw.
        :param seed: seed for random sampling.
        :return: ranks: Numpy array of shape (n_examples, ) containing the rank of each example in full
         setting (ranking against the full item corpus).
                ranks_random: Numpy array of shape (n_examples, ) containing the rank of  each example
                in random setting (ranking against randomly selected num_rand items).
        """
        total_examples = tf.data.experimental.cardinality(split_data).numpy()
        batch_size = min(batch_size, total_examples)
        ranks = np.ones(total_examples)
        ranks_random = np.ones(total_examples)

        for counter, input_tensor in enumerate(split_data.batch(batch_size)):
            targets = self.call(input_tensor).numpy()
            scores = self.call(input_tensor, all_items=True).numpy()
            scores[:, excluded_items] = -1e6
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


class BaseChami(CFModel, abc.ABC):
    """Euclidean attention model that combines reflections and rotations from Chami et al. 2020."""

    def __init__(self, n_entities, n_relations, item_ids, args):
        super().__init__(n_entities, n_relations, item_ids, args, train_bias=True)

        self.reflections = tf.keras.layers.Embedding(
            input_dim=n_relations,
            output_dim=self.dims,
            embeddings_initializer=self.initializer,
            embeddings_regularizer=self.relation_regularizer,
            name='reflection_weights')

        self.rotations = tf.keras.layers.Embedding(
            input_dim=n_relations,
            output_dim=self.dims,
            embeddings_initializer=self.initializer,
            embeddings_regularizer=self.relation_regularizer,
            name='rotation_weights')

        self.attention_vec = tf.keras.layers.Embedding(
            input_dim=n_relations,
            output_dim=self.dims,
            embeddings_initializer=self.initializer,
            embeddings_regularizer=self.relation_regularizer,
            name='attention_embeddings')
        self.scale = tf.keras.backend.ones(1) / np.sqrt(self.dims)

    def reflect_entities(self, entity, ref):
        queries = apply_reflection(ref, entity)
        return tf.reshape(queries, (-1, 1, self.dims))

    def rotate_entities(self, entity, rot):
        queries = apply_rotation(rot, entity)
        return tf.reshape(queries, (-1, 1, self.dims))

    def get_heads(self, input_tensor):
        heads = self.entities(input_tensor[:, 0])
        rotations = self.rotations(input_tensor[:, 1])
        reflections = self.reflections(input_tensor[:, 1])
        attn_vec = self.attention_vec(input_tensor[:, 1])
        ref_q = self.reflect_entities(heads, reflections)
        rot_q = self.rotate_entities(heads, rotations)

        # self-attention mechanism
        cands = tf.concat([ref_q, rot_q], axis=1)
        attn_vec = tf.reshape(attn_vec, (-1, 1, self.dims))
        att_weights = tf.reduce_sum(attn_vec * cands * self.scale, axis=-1, keepdims=True)
        att_weights = tf.nn.softmax(att_weights, axis=1)
        res = tf.reduce_sum(att_weights * cands, axis=1)
        return res
