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
"""File with keen dataset specific functions to collect and filter user-keen and keen-gem interactions"""

import json
import re
URL_RE = '((www\.[^\s]+)|(https?://[^\s]+)|(http?://[^\s]+))'
KEEN_METADATA = "data/keen/exports_2020-07-03_keens_and_gems.jsonl"
USER_ITEM_INTERACTIONS_FILE = "interactions.csv"


def load_user_keen_interactions(dataset_path, min_user_ints=5, min_item_ints=2, max_item_ints=50):
    """
    Maps raw csv interactions file of 'user_id,item_id' to a Dictonary.
    Discards users with less than 'min_interactions'

    :param dataset_path: Path to dataset dir containing interactions in a format user_id,keen_id
    :param min_user_ints: users with less than min_user_ints are discarded
    :param min_item_ints: items with less than min_keen_ints are discarded
    :param max_item_ints: items with more than max_keen_ints are discarded
    :return: Dictionary containing users as keys, and a list of items the user interacted with.
    """
    all_user_item_ints = load_interactions_file(dataset_path)
    all_item_user_ints = build_item_user_ints(all_user_item_ints)

    filtered_user_item_ints, filtered_items_user_ints = filter_interactions(all_user_item_ints, all_item_user_ints,
                                                                            min_user_ints=min_user_ints,
                                                                            min_item_ints=min_item_ints,
                                                                            max_item_ints=max_item_ints)

    print(f"Initial amount of users: {len(all_user_item_ints)}, items: {len(all_item_user_ints)}")
    print(f"Final amount of users: {len(filtered_user_item_ints)}, items: {len(filtered_items_user_ints)}")

    return filtered_user_item_ints


def load_keen_gems_interactions(dataset_path, min_keen_keen_edges=3, max_keen_keen_edges=100, min_overlapping_users=2,
                                min_keen_ints=10, min_item_ints=2, max_item_ints=100):
    """
    Loads user-keen interactions and from there it infers the keen-gem interactions, using users as edges
    between the keens.

    :param dataset_path: Path to dataset dir containing interactions in a format user_id,keen_id
    :param min_keen_keen_edges: keens interacting with less than min_keen_keen_edges are discarded.
    This is useful to filter rare keens that are not well connected to other keens.
    :param max_keen_keen_edges: keens interacting with more than max_keen_keen_edges are discarded.
    This is useful to filter very "popular" keens that are connected to too many keens, and result in a
    biased dataset.
    :param min_overlapping_users: to create an edge between two keens there has to be at least
    min_overlapping_users interacting with both of them
    :param min_keen_ints: keens with less than min_keen_ints interactions with gems are discarded
    :param min_item_ints: items (gems) with less than min_keen_ints are discarded
    :param max_item_ints: items (gems) with more than max_keen_ints are discarded
    :return:
    """

    all_user_item_ints = load_interactions_file(dataset_path)
    keen_keen_graph = build_keen_keen_graph(all_user_item_ints)
    all_keens = load_all_keens()

    # at this point there are some keens that interact with too many other keens because of a UI bias and they
    # have to be filtered out so they don't add their gems into the interactions
    filtered_keen_keen_graph = filter_keen_keen_graph(keen_keen_graph, min_keen_keen_edges=min_keen_keen_edges,
                                                      max_keen_keen_edges=max_keen_keen_edges,
                                                      min_overlapping_users=min_overlapping_users)
    print(f"Total amount of keen-keen interactions: {len(keen_keen_graph)}")
    print(f"Keen-keen interactions through at least {min_overlapping_users} users and filtering: "
          f"{len(filtered_keen_keen_graph)}")

    keen_gem_interactions = build_keen_gem_interactions(filtered_keen_keen_graph, all_keens)
    # the logic is exactly the same than with the user-keen matrix interaction after this point.
    # In this case user -> keen, item -> gem
    gem_keen_interactions = build_item_user_ints(keen_gem_interactions)

    filtered_keen_gem_ints, filtered_gem_keen_ints = filter_interactions(keen_gem_interactions, gem_keen_interactions,
                                                                         min_user_ints=min_keen_ints,
                                                                         min_item_ints=min_item_ints,
                                                                         max_item_ints=max_item_ints)

    interactions = sum((len(ints) for ints in filtered_keen_gem_ints.values()))
    print(f"Initial amount of keens: {len(keen_gem_interactions)}, items: {len(gem_keen_interactions)}")
    print(f"Final amount of keens: {len(filtered_keen_gem_ints)}, items: {len(filtered_gem_keen_ints)}")
    print(f"Density: {interactions * 100 / (len(filtered_keen_gem_ints) * len(filtered_gem_keen_ints)):.2f}%")

    return filtered_keen_gem_ints


def filter_keen_keen_graph(keen_keen_graph, min_keen_keen_edges=2, max_keen_keen_edges=100,
                           min_overlapping_users=2):
    """
    The keen-keen graph is built using overlapping users interacting with two given keens as edges.
    This function filters some keens from the graph.
    It is designed to remove keens with very few connections and with too many connections to
    other keens, so the dataset is not biased towards very popular keens.

    :param keen_keen_graph: a graph of keens.
    :param min_keen_keen_edges: keens interacting with less than min_keen_keen_edges are discarded.
    This is useful to filter rare keens that are not well connected to other keens.
    :param max_keen_keen_edges: keens interacting with more than max_keen_keen_edges are discarded.
    This is useful to filter very "popular" keens that are connected to too many keens, and result in a
    biased dataset.
    :param min_overlapping_users: to create an edge between two keens there has to be at least
    min_overlapping_users interacting with both of them
    :return: a filtered version of the input graph
    """
    keen_keen_graph = remove_by_min_overlapping_users(keen_keen_graph, min_overlapping_users)

    there_are_keens_to_remove = True
    keens_to_remove = set()
    while there_are_keens_to_remove:
        keen_keen_graph = remove_keens_from_graph(keen_keen_graph, keens_to_remove)

        keens_to_remove = set()
        for kid, ints in keen_keen_graph.items():
            if len(ints) < min_keen_keen_edges or len(ints) > max_keen_keen_edges:
                keens_to_remove.add(kid)

        there_are_keens_to_remove = len(keens_to_remove) != 0
        print(f"Keens with ints: {len(keen_keen_graph)}, keens to filter: {len(keens_to_remove)}")

    return keen_keen_graph


def remove_by_min_overlapping_users(keen_keen_graph, min_overlapping_user):
    """It only keeps the edges whose weight >= min_overlapping_user"""
    filtered = {}
    for ka, ints in keen_keen_graph.items():
        new_ints = {kb: n_users for kb, n_users in ints.items() if n_users >= min_overlapping_user}
        if new_ints:
            filtered[ka] = new_ints
    return filtered


def remove_keens_from_graph(keen_keen_graph, keens_to_remove):
    clean_keen_keen_graph = {}
    for kid, neighs in keen_keen_graph.items():
        if kid in keens_to_remove:
            continue

        valid_neighbors = {k_neigh: n_users for k_neigh, n_users in neighs.items() if k_neigh not in keens_to_remove}
        if valid_neighbors:
            clean_keen_keen_graph[kid] = valid_neighbors
    return clean_keen_keen_graph


def get_gem_ids(kid, all_keens):
    if kid not in all_keens:
        return set()
    return set([g.gem_id for g in all_keens[kid].gems])


def build_keen_gem_interactions(keen_keen_ints, all_keens):
    keen_gem_interactions = {}

    for ka, ints in keen_keen_ints.items():
        # each keen interacts with its own gems
        gems = get_gem_ids(ka, all_keens)

        # each keen interacts with its neighbors' gems
        for kb in ints:
            gems.update(get_gem_ids(kb, all_keens))

        keen_gem_interactions[ka] = gems
    return keen_gem_interactions


def increase_count(dict, ka, kb):
    """For an adjacency matrix modeled as a dictionary of dictionaries, it increases the count of the
    entry dict[ka][kb]"""
    if ka in dict:
        if kb in dict[ka]:
            dict[ka][kb] += 1
        else:
            dict[ka][kb] = 1
    else:
        dict[ka] = {kb: 1}


def build_keen_keen_graph(user_keen_interactions):
    """It models keen-keen graph using user as the connection.

    If a user interacts with keens A and B, then we add an edge between these keens.
    """
    keen_keen_ints = {}
    for uid, ints in user_keen_interactions.items():
        ints = list(ints)
        for i, ka in enumerate(ints):
            for kb in ints[i + 1:]:
                increase_count(keen_keen_ints, ka, kb)
                increase_count(keen_keen_ints, kb, ka)
    return keen_keen_ints


def load_interactions_file(dataset_path):
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
    return samples


def build_item_user_ints(interactions):
    item_user_ints = {}
    for uid, ints in interactions.items():
        for iid in ints:
            if iid in item_user_ints:
                item_user_ints[iid].add(uid)
            else:
                item_user_ints[iid] = {uid}
    return item_user_ints


def filter_user_interactions(user_item_ints, valid_items, min_user_ints=5, max_user_ints=10000):
    filtered_user_item_ints = {}
    for uid, ints in user_item_ints.items():
        new_ints = set([iid for iid in ints if iid in valid_items])

        if min_user_ints <= len(new_ints) <= max_user_ints:
            filtered_user_item_ints[uid] = new_ints
    return filtered_user_item_ints


def filter_interactions(user_item_ints, item_user_ints, min_user_ints=5, max_user_ints=10000, min_item_ints=2,
                        max_item_ints=50):
    """This function filters the interactions based on min_user_ints, max_user_ints, min_item_ints and max_item_ints.

    Iteratively:
        1 - Keeps users with N interactions with 'valid items', with min_user_ints <= N <= max_user_ints
        2 - Of the items that still participate in interactions, we define as 'valid items' those that have X
        interactions where min_item_ints <= X <= max_item_ints.
        Items that do not fulfil this criteria are considered 'invalid items' that must be filtered out.
        3 - If there is any 'invalid item', go back to Step 1.
    Returns the interaction matrices from both user and items perspectives (although the matrices
    contain the same information) with valid users and items.
    This is,
     - Users with at least min_user_ints interactions
     - Items with X interactions, where min_item_ints <= X <= max_item_ints
    """
    there_are_items_to_filter = True
    while there_are_items_to_filter:
        user_item_ints = filter_user_interactions(user_item_ints, item_user_ints, min_user_ints, max_user_ints)
        item_user_ints = build_item_user_ints(user_item_ints)

        items_to_filter = set([iid for iid, ints in item_user_ints.items()
                               if len(ints) < min_item_ints or len(ints) > max_item_ints])
        there_are_items_to_filter = len(items_to_filter) != 0
        print(f"Users: {len(user_item_ints)}, Items: {len(item_user_ints)}, Items to filter: {len(items_to_filter)}")
        item_user_ints = {iid: ints for iid, ints in item_user_ints.items() if iid not in items_to_filter}
    return user_item_ints, item_user_ints


def build_iid2title(item_id_key, item_title_key):
    """Builds a mapping between item ids and the title of each item."""
    iid2title = {}
    with open(KEEN_METADATA, "r") as f:
        for line in f:
            line = json.loads(line)
            if item_id_key in line and item_title_key in line:
                iid2title[line[item_id_key]] = line[item_title_key][1:-1]
    return iid2title


def load_all_keens():
    with open(KEEN_METADATA, "r") as f:
        data = [json.loads(line) for line in f]
    return get_keens(data)


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
    return string.replace("\\n", " ")


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
