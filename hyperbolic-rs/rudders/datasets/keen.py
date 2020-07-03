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
"""File with keen dataset specific functions"""

import json
import re
URL_RE = '((www\.[^\s]+)|(https?://[^\s]+)|(http?://[^\s]+))'
KEEN_METADATA = "data/keen/exports_2020-07-03_keens_and_gems.jsonl"
USER_ITEM_INTERACTIONS_FILE = "interactions.csv"


def load_interactions_to_dict(dataset_path, min_interactions=10):
    """
    Maps raw csv interactions file of 'user_id,item_id' to a Dictonary.
    Discards users with less than 'min_interactions'

    :param file_path: Path to file containing interactions in a format user_id,keen_id
    :param min_interactions: users with less than min_interactions are discarded
    :return: Dictionary containing users as keys, and a numpy array of items the user interacted with,
        sorted by the time of interaction.
    """
    samples = {}
    with open(str(dataset_path / USER_ITEM_INTERACTIONS_FILE), 'r') as f:
        next(f)
        for line in f:
            line = line.strip('\n').split(',')
            uid = line[0]
            iid = line[1]
            if uid in samples:
                samples[uid].add(iid)
            else:
                samples[uid] = {iid}

    all_items = set()
    for ints in samples.values(): all_items.update(ints)
    interactions = sum([len(v) for v in samples.values()])
    print(f"Processed users: {len(samples)}. Processed items: {len(all_items)}. Interactions: {interactions}")

    filtered_samples = {uid: ints for uid, ints in samples.items() if len(ints) >= min_interactions}

    filtered_items = set()
    for ints in filtered_samples.values(): filtered_items.update(ints)
    interactions = sum([len(v) for v in filtered_samples.values()])
    print(f"After filtering: users: {len(filtered_samples)}, items: {len(filtered_items)}, interactions: {interactions}")

    return filtered_samples


def build_iid2title(item_id_key, item_title_key):
    """Builds a mapping between item ids and the title of each item."""
    iid2title = {}
    with open(KEEN_METADATA, "r") as f:
        for line in f:
            line = json.loads(line)
            if item_id_key in line and item_title_key in line:
                iid2title[line[item_id_key]] = line[item_title_key][1:-1]
    return iid2title


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
        self.creator_uid = process_input(get_value(item, "gem_uid"))

    def is_empty(self):
        return not self.text and not self.link_url and not self.link_title and not self.link_description
