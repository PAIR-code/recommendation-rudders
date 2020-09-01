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
"""File with amazon dataset specific functions to collect user-item interactions"""
import json
import gzip

# Dictionary with item key: (reviews_file, item_metadata)
FILES = {
    "amzn-musicins": ("Musical_Instruments_5.json.gz", "meta_Musical_Instruments.json.gz"),
    "amzn-vgames": ("Video_Games_5.json.gz", "meta_Video_Games.json.gz")
}


def load_interactions_file(filepath):
    """
    :param filepath: file to 5-core amazon review file
    :return: dict of uid: interactions, sorted by ascending date
    """
    samples = {}
    with gzip.open(filepath, 'r') as f:
        for review in map(json.loads, f):
            uid = review["reviewerID"]
            iid = review["asin"]
            timestamp = review["unixReviewTime"]
            if uid in samples:
                samples[uid].append((iid, timestamp))
            else:
                samples[uid] = [(iid, timestamp)]
    sorted_samples = {}
    for uid, ints in samples.items():
        # since a user can interact with the same items several time, the pair (user, item_id)
        # can appear both in train and test and we want to avoid this. Therefore we delete
        # repetitions and keep only the first interaction
        sorted_ints = sorted(ints, key=lambda p: p[1])
        unique_iid_ints = set()
        filtered_ints = []
        for iid, _ in sorted_ints:
            if iid not in unique_iid_ints:
                unique_iid_ints.add(iid)
                filtered_ints.append(iid)
        sorted_samples[uid] = filtered_ints
    return sorted_samples


def load_interactions(dataset_path, item_key):
    """
    Loads the interaction file extracted from users' reviews

    :param dataset_path: path to amazon dataset
    :param item_key: key to index FILES dict
    :return: dict of uid: interactions, sorted by ascending date
    """
    reviews_file = FILES[item_key][0]
    return load_interactions_file(dataset_path / reviews_file)


def build_itemid2name(dataset_path, item_key):
    """
    Loads item titles and creates a dictionary

    :param dataset_path: path to amazon dataset
    :param item_key: key to index FILES dict
    :return: dict of iid: item_title
    """
    metadata_file = FILES[item_key][1]
    with gzip.open(str(dataset_path / metadata_file), 'r') as f:
        return {meta["asin"]: meta.get("title", "None")[:100] for meta in map(json.loads, f)}


def load_reviews(filepath, revs_to_keep=10):
    """
    :param filepath: file to 5-core amazon review file
    :param revs_to_keep: sorts reviews by length and only keeps revs_to_keen longest ones
    :return: dict of iid: list of reviews
    """
    reviews = {}
    with gzip.open(filepath, 'r') as f:
        for line in map(json.loads, f):
            iid = line["asin"]
            this_rev = [line.get("summary"), line.get("reviewText")]
            this_rev = ". ".join([x for x in this_rev if x])
            if iid in reviews:
                reviews[iid].append(this_rev)
            else:
                reviews[iid] = [this_rev]
    # sorts reviews by length to filter out short ones
    for iid in reviews:
        this_revs = sorted(reviews[iid], key=lambda r: len(r), reverse=True)
        reviews[iid] = this_revs[:revs_to_keep]
    return reviews


def load_metadata_as_text(filepath):
    """
    :param filepath: file to amazon item metadata file
    :return: dict of iid: metadata as one string
    """
    metadata = {}
    with gzip.open(filepath, 'r') as f:
        for line in map(json.loads, f):
            iid = line["asin"]
            this_meta = [line.get("title", "")]
            this_meta += line.get("description", [])
            this_meta += line.get("feature", [])
            if "category" in line:
                cats = line.get("category")
                main_cat = line.get("main_cat")
                if main_cat:
                    try:
                        cats.remove(main_cat)   # main cat is the same for all items, so we remove it
                    except ValueError:
                        pass
                this_meta += cats
            metadata[iid] = ". ".join(this_meta)
    return metadata


def build_text_from_items(dataset_path, item_key):
    """
    Build the text that represents each item.
    The text is made of:
     - Item title, and everything that is available from the metadata, which can be (not for all items):
        - features of the item
        - description
        - categories
     - Item reviews created by users.

    :param dataset_path: path to amazon dataset
    :param item_key: key to index FILES dict
    :return: dict of iid: list of text for each item
    """
    reviews_file = FILES[item_key][0]
    print(f"Loading amazon reviews from {dataset_path / reviews_file}")
    texts = load_reviews(dataset_path / reviews_file)

    metadata_file = FILES[item_key][1]
    print(f"Loading amazon metadata from {dataset_path / metadata_file}")
    metadata = load_metadata_as_text(dataset_path / metadata_file)

    # We are only interested in the iids in texts, metadata is much larger
    no_meta = 0
    for iid in texts:
        if iid in metadata:
            texts[iid] = [metadata[iid]] + texts[iid]
        else:
            no_meta += 1

    print(f"Items with no metadata {no_meta}: {no_meta * 100 / len(texts):.2f}%")
    return texts


class AmazonItem:
    def __init__(self, metadata):
        """
        :param metadata: dict extracted from json file with amazon item metadata
        """
        self.id = metadata["asin"]
        self.cobuys = metadata.get("also_buy", [])
        self.coviews = metadata.get("also_view", [])
        self.categories = metadata.get("category", [])
        self.brand = metadata.get("brand", "")


def load_metadata(dataset_path, item_key):
    """
    Loads metadata as a dict

    :param dataset_path: path to amazon dataset
    :param item_key: key to index FILES dict
    :return: dict of dicts with metadata
    """
    filepath = dataset_path / FILES[item_key][1]
    print(f"Loading amazon metadata from {filepath}")
    with gzip.open(filepath, 'r') as f:
        return [AmazonItem(line) for line in map(json.loads, f)]
