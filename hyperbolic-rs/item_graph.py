from absl import app, flags
from pathlib import Path
import pickle
import json
import re
import numpy as np
import tensorflow as tf
import tensorflow_hub as hub

URL_RE = '((www\.[^\s]+)|(https?://[^\s]+)|(http?://[^\s]+))'
FLAGS = flags.FLAGS
flags.DEFINE_string('file', default='', help='Path to file with keen data')
flags.DEFINE_string('dst_path', default='data/prep', help='Path to dir to store results')


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
        texts[kid] = (keen.title, keen_sents)
    return texts


def build_vecs(keen_text):
    """
    Build keen embedddings based on the text in their title, description and gems.
    It uses the Universal Sentence Encoder to get embeddings from text.
    """
    use_model = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
    result = {}
    for kid, (title, sents) in keen_text.items():
        embs = use_model([title] + sents)
        # gives higher weight to title
        weights = np.ones([1, len(embs)])
        weights[0, 0] = 2
        weights = tf.convert_to_tensor(weights, dtype=tf.float32)
        weights = tf.keras.activations.softmax(weights, axis=-1)
        keen_embeds = tf.transpose(weights) * embs
        # Takes mean of weighted embeddings
        keen_embeds = tf.reduce_sum(keen_embeds, axis=0, keepdims=True)
        result[kid] = keen_embeds
    return result


def export_embeds(embeds, dst_path, file_name):
    dst_file = file_name.split("/")[-1].split(".")[0] + ".csv"
    with open(str(dst_path / dst_file), "w") as f:
        for kid, vec in embeds.items():
            values = ",".join([str(x) for x in vec[0].numpy()])
            f.write(f"{kid},{values}\n")


def build_cossim_matrix(keen_embeds):
    """
    Build a cosine similarity matrix between all the embeddings.
    From cosine similarity computes and returns angle in radians.
    See Section 5 in paper: https://arxiv.org/abs/1803.11175
    """
    kids = list(keen_embeds.keys())
    embeds = tf.concat([keen_embeds[k] for k in kids], axis=0)      # len(keen) x embed_dim
    embeds = tf.math.l2_normalize(embeds, axis=1)
    cossim_matrix = embeds @ tf.transpose(embeds)
    return kids, tf.clip_by_value(cossim_matrix, -1.0, 1.0)


def save_as_pickle(dst_dir, data):
    """
    Saves data to train, dev, test and samples pickle files.

    :param dst_dir: String path saving directory.
    :param data: Data to store
    """
    save_path = dst_dir / 'keen_cossim.pickle'
    with open(str(save_path), 'wb') as fp:
        pickle.dump(data, fp)


def main(_):
    dst_path = Path(FLAGS.dst_path)
    data = get_data(FLAGS.file)
    all_keens = get_keens(data)

    # keeps keens with at least one gem
    keens = {k: v for k, v in all_keens.items() if v.gems}
    print(f"Total amount of keens: {len(all_keens)}")
    print(f"Keen with at least one gem: {len(keens)}")

    texts = build_texts_from_keens(keens)
    print("Text to encode with USE")
    print(list(texts.items())[:3])

    embeds = build_vecs(texts)
    export_embeds(embeds, dst_path, FLAGS.file)

    keen_ids, cossim_matrix = build_cossim_matrix(embeds)
    result = {"keen_ids": keen_ids, "cossim_matrix": cossim_matrix}
    save_as_pickle(dst_path, result)


if __name__ == '__main__':
    app.run(main)
