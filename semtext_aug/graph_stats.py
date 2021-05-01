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

import os.path
import tensorflow as tf
import numpy as np
import pickle
import networkx as nx
from absl import app, flags, logging
from rudders.relations import Relations
from rudders.graph.seccurv import seccurv
from rudders.utils import set_seed, setup_logger

FLAGS = flags.FLAGS
flags.DEFINE_string('prep_dir', default='data/prep', help='Path to data directory')
flags.DEFINE_string('dataset', default='amazon', help='Dataset (keen, gem, ml-1m or amazon)')
flags.DEFINE_string('prep_name', default='Software-top10', help='Name of prep file to load')
flags.DEFINE_boolean('use_semantic_relation', default=True, help='Whether to use this relation or not')
flags.DEFINE_boolean('use_cobuy_relation', default=True, help='Whether to use this relation or not')
flags.DEFINE_boolean('use_coview_relation', default=True, help='Whether to use this relation or not')
flags.DEFINE_boolean('use_category_relation', default=True, help='Whether to use this relation or not')
flags.DEFINE_boolean('use_brand_relation', default=True, help='Whether to use this relation or not')
flags.DEFINE_float('sample_ratio', default=0.2, help='Ratio to sample nodes from graph for seccurv')
flags.DEFINE_integer('max_neigh_pairs', default=500, help='max neighbor pairs for seccurv')
flags.DEFINE_integer('seed', default=42, help='Random seed')
flags.DEFINE_boolean('debug', default=True, help='Debug mode')


def setup_relations(train, args):
    """
    Filters out relations of the train data according to args

    :param train: train split represented as a numpy array of train_len x 3 with (head, relation, tail)
    :param args: namespace with information about which relations should filter
    :return: filtered_train: numpy array of final_train_len x 3 only with allowed relations
            n_relations: amount of allowed relations
    """
    allowed_relations = {Relations.USER_ITEM.value}     # User Item is always required
    if args.use_semantic_relation:
        allowed_relations.add(Relations.SEM_LOW_SIM.value)
        allowed_relations.add(Relations.SEM_MEDIUM_SIM.value)
        allowed_relations.add(Relations.SEM_HIGH_SIM.value)
    if args.use_cobuy_relation:
        allowed_relations.add(Relations.COBUY.value)
    if args.use_coview_relation:
        allowed_relations.add(Relations.COVIEW.value)
    if args.use_category_relation:
        allowed_relations.add(Relations.CATEGORY.value)
    if args.use_brand_relation:
        allowed_relations.add(Relations.BRAND.value)
    filtered_train = [triplet for triplet in train if triplet[1] in allowed_relations]
    all_rels = len(allowed_relations) == 8
    return np.array(filtered_train).astype(np.int64), all_rels


def load_data(args):
    file_path = os.path.join(args.prep_dir, args.dataset, f'{args.prep_name}.pickle')
    logging.info(f"Loading data from {file_path}")
    with tf.io.gfile.GFile(file_path, mode="rb") as f:
        data = pickle.load(f)
    # splits
    train = data["train"] if not args.debug else data["train"][:1000].astype(np.int64)
    train, all_rels = setup_relations(train, args)
    if args.debug:
        return train, all_rels

    return np.concatenate((train, data["dev"], data["test"]), axis=0), all_rels


def build_graph(triplets):
    g = nx.Graph()
    for triplet in triplets:
        src, dst = triplet[0], triplet[-1]
        g.add_edge(src, dst)
    return g


def main(_):
    setup_logger(print_logs=True, save_logs=False, save_path="", run_id="")
    set_seed(FLAGS.seed, set_tf_seed=False)
    triplets, all_rels = load_data(FLAGS)
    graph = build_graph(triplets)
    logging.info(nx.info(graph))

    curvatures = seccurv(graph, sample_ratio=FLAGS.sample_ratio, max_neigh_pairs=FLAGS.max_neigh_pairs)
    out_file = f"outseccurv-{FLAGS.prep_name.split('-')[0]}-{'all' if all_rels else 'no'}rel"
    np.save(out_file, curvatures)


if __name__ == '__main__':
    app.run(main)
