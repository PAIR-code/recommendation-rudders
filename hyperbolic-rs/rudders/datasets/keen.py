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
KEEN_METADATA = "data/keen/keens_and_gems_25_june_2020.json"
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
