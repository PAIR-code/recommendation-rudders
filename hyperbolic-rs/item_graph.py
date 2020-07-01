from absl import app, flags
from pathlib import Path
import pickle
import json
import re
from tqdm import tqdm
import networkx as nx
import numpy as np
import tensorflow as tf
import tensorflow_hub as hub

URL_RE = '((www\.[^\s]+)|(https?://[^\s]+)|(http?://[^\s]+))'
FLAGS = flags.FLAGS
flags.DEFINE_string('file', default='', help='Path to file with keen data')
flags.DEFINE_string('item', default='keen', help='Item to create embeddings: keen or gem')
flags.DEFINE_string('dst_path', default='data/prep', help='Path to dir to store results')
flags.DEFINE_float('threshold', default=0.65, help='Cosine similarity threshold to add edges')
flags.DEFINE_boolean('use_distance', default=False, help='Whether to use cosine distance as weight or each edge is 1')


def process_input(string):
    string = string[1:-1] if type(string) == str else ""
    return string.replace("\\n", "")


def get_value(item, key):
    return item[key] if key in item else ""


class Keen:
    def __init__(self, keen_id, title, description, creator_uid):
        self.keen_id = keen_id
        self.title = process_input(title)
        self.description = process_input(description)
        self.creator_uid = process_input(creator_uid)
        self.gems = []


class Gem:
    def __init__(self, item):
        self.gem_id = get_value(item, "gem_id")
        text = get_value(item, "gem_text")
        text = re.sub(URL_RE, '', text)  # replace URL for empty string
        self.text = process_input(text)
        self.link_url = process_input(get_value(item, "gem_link_url"))
        self.link_title = process_input(get_value(item, "gem_link_title"))
        self.link_description = process_input(get_value(item, "gem_link_description"))
        self.creator_uid = process_input(get_value(item, "gem_userid"))

    def is_empty(self):
        return not self.text and not self.link_url and not self.link_title and not self.link_description


def get_data(path):
    data = []
    with open(path, "r") as f:
        for line in f:
            data.append(json.loads(line))
    return data


def get_keens(data):
    all_keens = {}
    for item in data:
        keen_id = item["keen_id"]
        gem = None
        if "gem_id" in item:
            gem = Gem(item)

        if keen_id in all_keens:
            keen = all_keens[keen_id]
        else:
            keen = Keen(item["keen_id"], item["keen_title"], get_value(item, "keen_description"),
                        item["keen_creator_uid"])
            all_keens[keen_id] = keen

        if gem is not None and not gem.is_empty():
            keen.gems.append(gem)
    return all_keens


def build_texts_from_keens(keens):
    texts = {}
    for kid, keen in keens.items():
        keen_sents = [keen.description]
        for gem in keen.gems:
            keen_sents.append(gem.text)
            keen_sents.append(gem.link_title)
            keen_sents.append(gem.link_description)
        keen_sents = [s for s in keen_sents if s]   # filters empty sentences
        keen_sents = [keen.title] + keen_sents      # title is always the first element in the list
        texts[kid] = keen_sents
    return texts


def build_item_embeds(item_text, weight_first_embedding=False):
    """
    Build item embeddings based on the text they contain.
    It uses the Universal Sentence Encoder to get embeddings from text.
    """
    use_model = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
    result = {}
    for iid, sents in item_text.items():
        embs = use_model(sents)

        weights = np.ones([1, len(embs)])
        if weight_first_embedding:  # gives higher weight to title in keen case
            weights[0, 0] = 2
        weights = tf.convert_to_tensor(weights, dtype=tf.float32)
        weights = tf.keras.activations.softmax(weights, axis=-1)
        keen_embeds = tf.transpose(weights) * embs
        # Takes mean of weighted embeddings
        keen_embeds = tf.reduce_sum(keen_embeds, axis=0, keepdims=True)
        result[iid] = keen_embeds
    return result


def export_embeds(embeds, dst_path):
    with open(str(dst_path / "item_embeddings.csv"), "w") as f:
        for iid, vec in embeds.items():
            values = ",".join([str(x) for x in vec[0].numpy()])
            f.write(f"{iid},{values}\n")


def build_cossim_matrix(item_embeds):
    iids = list(item_embeds.keys())
    embeds = tf.concat([item_embeds[k] for k in iids], axis=0)      # len(item_embeds) x embed_dim
    embeds = tf.math.l2_normalize(embeds, axis=1)
    cossim_matrix = embeds @ tf.transpose(embeds)
    return iids, tf.clip_by_value(cossim_matrix, -1.0, 1.0)


def build_graph(iids, cossim_matrix, threshold, use_distance):
    """
    Builds graph connecting items only if their cosine similarity is above 'threshold'.
    The weight of the edge can be the cosine distance if 'use_distance' is True. Otherwise each edge counts as 1.
    """
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


def save_as_pickle(path, data):
    with open(str(path), 'wb') as fp:
        pickle.dump(data, fp)


def plot_graph(graph, dst_path):
    import matplotlib.pyplot as plt

    fig = plt.figure()
    pos = nx.spring_layout(graph, iterations=100)
    nx.draw(graph, pos, ax=fig.add_subplot(111), node_size=10)
    plt.savefig(str(dst_path))


def main(_):
    dst_path = Path(FLAGS.dst_path) / FLAGS.item
    data = get_data(FLAGS.file)
    all_keens = get_keens(data)

    # keeps keens with at least one gem
    keens = {k: v for k, v in all_keens.items() if v.gems}
    print(f"Total amount of keens: {len(all_keens)}")
    print(f"Keen with at least one gem: {len(keens)}")

    if FLAGS.item == "keen":
        texts = build_texts_from_keens(keens)
    else:
        raise NotImplemented()  # TODO!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    print(f"Text from {FLAGS.item} to encode with USE")
    print(list(texts.items())[:3])

    embeds = build_item_embeds(texts, weight_first_embedding=FLAGS.item == "keen")
    export_embeds(embeds, dst_path)

    item_ids, cossim_matrix = build_cossim_matrix(embeds)

    graph = build_graph(item_ids, cossim_matrix, FLAGS.threshold, FLAGS.use_distance)
    print(f"Graph info:\n{nx.info(graph)}")
    plot_graph(graph, dst_path / f'item_item_graph_th{FLAGS.threshold}.png')

    all_distances = dict(nx.all_pairs_shortest_path_length(graph))

    result = {"item_item_distances": all_distances}
    file_name = f'item_item_{"cosine" if FLAGS.use_distance else "hop"}_distance_th{FLAGS.threshold}.pickle'
    save_path = dst_path / file_name
    save_as_pickle(save_path, result)


if __name__ == '__main__':
    app.run(main)
