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
"""Script to compute baseline based on item popularity"""

from absl import app, flags
from train import load_data
import tensorflow as tf
import numpy as np
from rudders.utils import rank_to_metric_dict

FLAGS = flags.FLAGS
flags.DEFINE_string('pop_prep_dir', default='data/prep', help='Path to data directory')
flags.DEFINE_string('pop_dataset', default='keen', help='Dataset (keen, gem or ml-1m)')
flags.DEFINE_string('pop_prep_name', default='ukeen-minint5-random', help='Name of prep file to load')
flags.DEFINE_boolean('pop_debug', default=True, help='Uses 1000 examples for debugging purposes')


def random_eval(pop_ranking, split_data, samples, batch_size=500, num_rand=100, seed=1234):
    """Compute ranking-based evaluation metrics in both full and random settings.

    Args:
      split_data: Tensor of size n_examples x 2 containing pairs' indices.
      samples: Dict representing items to skip per user for evaluation in the filtered setting.
      batch_size: batch size to use to compute scores.
      num_rand: number of negative samples to draw.
      seed: seed for random sampling.

    Returns:
    ranks: Numpy array of shape (n_examples, ) containing the rank of each example in full setting
    ranks_random: Numpy array of shape (n_examples, ) containing the rank of each example in random setting
    """
    total_examples = tf.data.experimental.cardinality(split_data).numpy()
    batch_size = min(batch_size, total_examples)
    ranks = np.ones(total_examples)
    ranks_random = np.ones(total_examples)
    for counter, input_tensor in enumerate(split_data.batch(batch_size)):
        scores = np.repeat(pop_ranking, len(input_tensor), axis=0)
        targets = np.reshape(np.array([scores[i, input_tensor[i, 1]] for i in range(len(input_tensor))]), (-1, 1))
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


def main(_):
    train, dev, test, samples, n_users, n_items, data = load_data(FLAGS.pop_prep_dir, FLAGS.pop_dataset,
                                                                  FLAGS.pop_prep_name, FLAGS.pop_debug)
    sorted_items = sort_items_by_popularity(samples)

    print_most_popular_items(data, sorted_items)

    pop_ranking = np.ones((1, len(sorted_items)))
    for i, (item_idx, _) in enumerate(sorted_items):
        pop_ranking[0, item_idx] = len(sorted_items) - i

    random_items = 100
    for title, split in zip(["DEV", "TEST"], [dev, test]):

        rank_all, rank_random = random_eval(pop_ranking, split, samples, num_rand=random_items)

        metric_all, metric_random = rank_to_metric_dict(rank_all), rank_to_metric_dict(rank_random)

        print(f"Result for {title.upper()}")
        print(f"Random items {random_items}: " + " ".join((f"{k}: {v:.2f}" for k, v in metric_random.items())))
        print("All items: " + " ".join((f"{k}: {v:.2f}" for k, v in metric_all.items())))


def sort_items_by_popularity(samples):
    item_degree = {}
    for uid, ints in samples.items():
        for item_idx in ints:
            if item_idx in item_degree:
                item_degree[item_idx] += 1
            else:
                item_degree[item_idx] = 1
    sorted_item_degree = sorted(item_degree.items(), key=lambda item: item[1], reverse=True)
    return sorted_item_degree


def print_most_popular_items(data, sorted_item_degree, top_items=25):
    id2iid, iid2name = data["id2iid"], data["iid2name"]
    print(f"{top_items} most popular items")
    for item_idx, pop in sorted_item_degree[:top_items]:
        print(f"{pop} - {iid2name[id2iid[item_idx]]}")


if __name__ == '__main__':
    app.run(main)
