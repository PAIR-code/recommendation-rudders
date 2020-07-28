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
"""Script to create an item-item graph based on semantic similarities from the text in the items"""

from absl import app, flags
from pathlib import Path
import json
from tqdm import tqdm
import networkx as nx
import numpy as np
import tensorflow as tf
from tensorflow.keras.metrics import CosineSimilarity
import tensorflow_hub as hub
from rudders.utils import save_as_pickle
from rudders.datasets.keen import get_keens, build_texts_from_keens, build_texts_from_gems
from rudders.datasets.movielens import build_texts_from_movies


FLAGS = flags.FLAGS
flags.DEFINE_string('dataset_path', default='data/ml-1m', help='Path to raw dataset: data/keen, data/ml-1m')
flags.DEFINE_string('file', default='movies.dat',
                    help='Path to file with textual data ("movies.dat" for ml-1m or '
                         '"exports_2020-07-03_keens_and_gems.jsonl" for keen)')
flags.DEFINE_string('item', default='keen', help='Item to create embeddings if dataset is keen: keen or gem')
flags.DEFINE_string('dst_path', default='data/prep', help='Path to dir to store results')
flags.DEFINE_string('text_embeddings', default='data/prep/ml-1m/item_embeddings.csv', help='If provided, it takes embeddings from file')
flags.DEFINE_float('threshold', default=0.75, help='Cosine similarity threshold to add edges')
flags.DEFINE_string('use_model_url', default="https://tfhub.dev/google/universal-sentence-encoder-large/5",
                    help='URL of Universal Sentence Encoder Model')
flags.DEFINE_integer('max_embedding_len', default=65536,
                     help='If there are less embeddings than max_embedding_len, it will compute the similarity'
                          'all at once using matrix multiplication. This is faster but much more memory expensive. '
                          'If not, it will compute it "on the fly", which does not take as much memory but it is'
                          'way slower.')
flags.DEFINE_boolean('use_distance', default=False, help='Whether to use cosine distance as weight or each edge is 1')
flags.DEFINE_boolean('plot', default=False, help='Whether to plot item-item graph or not')


def load_jsonl(path):
    data = []
    with open(path, "r") as f:
        for line in f:
            data.append(json.loads(line))
    return data


def build_item_embeds(item_text, use_url, weight_first_embedding=False):
    """
    Build item embeddings based on the text they contain.
    It uses the Universal Sentence Encoder to get embeddings from text.

    To get the Keen embedding, it creates a text embedding from the keen title, keen description
    and the content of each gem. Then it takes a weighted average of all these embeddings giving
    extra weight to the keen title since usually it is a good summary of the keen's topic.

    To get the Gem embedding, it creates a text embedding from the gem text, link's title and
    link's description. In that case, the final embedding is just the average of the previous
    embeddings, without any special weight.
    """
    use_model = hub.load(use_url)
    result = {}
    for iid, sents in tqdm(item_text.items(), total=len(item_text)):
        embs = use_model(sents)

        weights = np.ones([1, len(embs)])
        if weight_first_embedding:  # gives higher weight to title in keen case
            weights[0, 0] = 2
        weights = tf.convert_to_tensor(weights, dtype=tf.float32)
        weights = tf.keras.activations.softmax(weights, axis=-1)
        item_embeds = tf.transpose(weights) * embs
        # Takes mean of weighted embeddings
        item_embeds = tf.reduce_sum(item_embeds, axis=0, keepdims=True)
        result[iid] = item_embeds
    return result


def export_text_embeddings(embeds, dst_path):
    """Export embeddings in CSV format emulating GloVe format"""
    with open(str(dst_path / "item_embeddings.csv"), "w") as f:
        for iid, vec in embeds.items():
            values = ",".join([str(x) for x in vec[0].numpy()])
            f.write(f"{iid},{values}\n")


def load_text_embeddings(text_embeddings_path):
    """Loads pre-computed text embeddings. They must be persisted in CSV format"""
    embeds = {}
    with open(text_embeddings_path, "r") as f:
        for line in f:
            data = line.strip().split(",")
            iid = data[0]
            emb = tf.convert_to_tensor([[float(x) for x in data[1:]]])
            embeds[iid] = emb
    return embeds


def build_cossim_matrix(item_embeds):
    iids = list(item_embeds.keys())
    embeds = tf.cast(tf.concat([item_embeds[k] for k in iids], axis=0), tf.float16)    # len(item_embeds) x embed_dim
    embeds = tf.math.l2_normalize(embeds, axis=1)
    cossim_matrix = embeds @ tf.transpose(embeds)
    return iids, tf.clip_by_value(cossim_matrix, -1.0, 1.0)


def build_graph(iids, cossim_matrix, threshold, use_distance):
    """
    Builds graph connecting items only if their cosine similarity is above 'threshold'.
    The weight of the edge can be the cosine distance if 'use_distance' is True. Otherwise each edge counts as 1.

    :param iids: list of items ids (unique alpha numeric ids)
    :param cossim_matrix: precomputed matrix of cosine similarities between the all the embeddings
    :param threshold: only pairs of items with similarity above threshold will be added to the graph
    :param use_distance: if True, the cosine similarity is converted to cosine distance and added
    as the edge weight. If False, the edge weight is 1.
    """
    threshold = tf.convert_to_tensor(threshold, dtype=tf.float16)
    graph = nx.Graph()
    for i in tqdm(range(len(iids)), desc="build_graph"):
        for j in range(i + 1, len(iids)):
            similarity = cossim_matrix[i, j]
            if similarity > threshold:
                ki, kj = iids[i], iids[j]
                weight = 1 - similarity.numpy().item() if use_distance else 1
                graph.add_edge(ki, kj, weight=weight)
                graph.add_edge(kj, ki, weight=weight)
    return graph


def build_graph_from_embeds(item_embeds, threshold, use_distance):
    """
    This function has the same functionality than 'build_graph' but instead of receiving the cossim_matrix
    as a parameter, it calculates the cosine similarity between each pair of embeddings in place.

    In case that the cossim_matrix is too large and it doesn't fit in memory, this method should be used.
    However, this method is much slower than precomputing the cossim_matrix.
    """
    cossim = CosineSimilarity()
    iids = list(item_embeds.keys())
    graph = nx.Graph()
    for i in tqdm(range(len(iids)), desc="build_graph_from_embeds"):
        emb_i = item_embeds[iids[i]]
        for j in range(i + 1, len(iids)):
            emb_j = item_embeds[iids[j]]
            similarity = cossim(emb_i, emb_j)
            if similarity > threshold:
                ki, kj = iids[i], iids[j]
                weight = 1 - similarity.numpy().item() if use_distance else 1
                graph.add_edge(ki, kj, weight=weight)
                graph.add_edge(kj, ki, weight=weight)
    return graph


def plot_graph(graph, dst_path):
    import matplotlib.pyplot as plt

    fig = plt.figure()
    pos = nx.spring_layout(graph, iterations=100)
    nx.draw(graph, pos, ax=fig.add_subplot(111), node_size=10)
    plt.savefig(str(dst_path))


def main(_):
    dst_path = Path(FLAGS.dst_path)
    if not FLAGS.text_embeddings:
        text_file_path = Path(FLAGS.dataset_path) / FLAGS.file

        if "keen" in FLAGS.dataset_path:
            dst_path = dst_path / FLAGS.item
            data = load_jsonl(text_file_path)
            all_keens = get_keens(data)

            # keeps keens with at least one gem
            keens = {k: v for k, v in all_keens.items() if v.gems}
            print(f"Total amount of keens: {len(all_keens)}")
            print(f"Keen with at least one gem: {len(keens)}")

            if FLAGS.item == "keen":
                texts = build_texts_from_keens(keens)
            else:
                texts = build_texts_from_gems(keens)
        elif "ml-1m" in FLAGS.dataset_path:
            texts = build_texts_from_movies(text_file_path)
            FLAGS.item = "ml-1m"
            dst_path = dst_path / FLAGS.item
        else:
            raise ValueError(f"Unrecognized dataset_path: {FLAGS.dataset_path}")

        print(f"Items with text from {FLAGS.item} to encode with USE: {len(texts)}")
        print(list(texts.items())[:3])

        embeds = build_item_embeds(texts, FLAGS.use_model_url, weight_first_embedding=FLAGS.item == "keen")
        export_text_embeddings(embeds, dst_path)

    else:
        embeds = load_text_embeddings(FLAGS.text_embeddings)

    if len(embeds) < FLAGS.max_embedding_len:
        item_ids, cossim_matrix = build_cossim_matrix(embeds)
        graph = build_graph(item_ids, cossim_matrix, FLAGS.threshold, FLAGS.use_distance)
    else:
        # if there are N embeddings, the cossim_matrix is N^2, which might not fit in memory for large values of N.
        # In this case, we compute the cosine similarity for each pair of embeddings, but this is deadly slow
        graph = build_graph_from_embeds(embeds, FLAGS.threshold, FLAGS.use_distance)

    print(f"Graph info:\n{nx.info(graph)}")
    if FLAGS.plot:
        plot_graph(graph, dst_path / f'item_item_graph_th{FLAGS.threshold}.png')

    all_pairs = nx.all_pairs_dijkstra(graph, weight="weight" if FLAGS.use_distance else None)
    all_distances = {n: dist for n, (dist, path) in all_pairs}

    result = {"item_item_distances": all_distances}
    file_name = f'item_item_{"cosine" if FLAGS.use_distance else "hop"}_distance_th{FLAGS.threshold}'
    nx.write_weighted_edgelist(graph, str(dst_path / (file_name + ".edgelist")))
    save_as_pickle(dst_path / (file_name + ".pickle"), result)


if __name__ == '__main__':
    app.run(main)
