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
"""File with logic specific to preprocess and build amazon relations triplets"""
from rudders.datasets.amazon import load_metadata
from rudders.relations import Relations
from rudders.utils import add_to_train_split


def get_co_triplets(item_metas, get_aspect_func, iid2id, relation_id):
    """
    Creates triplets based on co_buy or co_view relations taken from metadata
    :param item_metas: list of amazon metadata objects
    :param get_aspect_func: a function that extract either co_buy or co_view data
    :param iid2id: dict of item ids
    :param relation_id: relation index
    :return: list of triplets
    """
    triplets = set()
    for item in item_metas:
        head_id = iid2id[item.id]
        for co_rel_id in get_aspect_func(item):
            if co_rel_id in iid2id:
                tail_id = iid2id[co_rel_id]
                triplets.add((head_id, relation_id, tail_id))
    return list(triplets)


def get_category_triplets(item_metas, cat2id, iid2id, relation_id):
    """
    Builds triplets based on categorical labels.
    For each item: (item, has_category, category)

    :param item_metas: list of amazon metadata objects
    :param cat2id: dict of category ids
    :param iid2id: dict of item ids
    :param relation_id: relation index for has_category relation
    :return: list of triplets
    """
    triplets = set()
    for it_meta in item_metas:
        for cat in it_meta.categories:
            item_id = iid2id[it_meta.id]
            cat_id = cat2id[cat]
            triplets.add((item_id, relation_id, cat_id))
    return list(triplets)


def get_brand_triplets(item_metas, brand2id, iid2id, relation_id):
    """
    Builds triplets based on brands.
    For each item: (item, has_brand, brand)

    :param item_metas: list of amazon metadata objects
    :param brand2id: dict of brand ids
    :param iid2id: dict of item ids
    :param relation_id: relation index for has_brand relation
    :return: list of triplets
    """
    triplets = set()
    for it_meta in item_metas:
        if it_meta.brand:
            item_id = iid2id[it_meta.id]
            brand_id = brand2id[it_meta.brand]
            triplets.add((item_id, relation_id, brand_id))
    return list(triplets)


def get_cat2id(item_metas, n_entities):
    """Extracts all categories from item metada and maps them to an id"""
    categories = set([cat for it_meta in item_metas for cat in it_meta.categories])
    return {cate: n_entities + i for i, cate in enumerate(categories)}


def load_relations(data, dataset_path, item_name, iid2id, n_entities):
    """
    Loads relations extracted from the amazon dataset.
    Modifies training data (in data variable) in place.

    :param data: dict with train split as key to extend it with new triplets
    :param dataset_path: path to dataset to load the metada
    :param item_name: item name that refers to s specific subset of the amazon data
    :param iid2id: dict of item_ids to numerical index
    :param n_entities: current amount of entities in the data
    :return: updates number of entities after adding new relations
    """
    item_metas = load_metadata(dataset_path, item_name)
    item_metas = [it_meta for it_meta in item_metas if it_meta.id in iid2id]

    # co buy relations
    cobuy_triplets = get_co_triplets(item_metas, lambda x: x.cobuys, iid2id, Relations.COBUY.value)
    add_to_train_split(data, cobuy_triplets)
    print(f"Added co-buy triplets: {len(cobuy_triplets)}")

    # co view relations
    coview_triplets = get_co_triplets(item_metas, lambda x: x.coviews, iid2id, Relations.COVIEW.value)
    add_to_train_split(data, coview_triplets)
    print(f"Added co-view triplets: {len(coview_triplets)}")

    # category relations
    cat2id = get_cat2id(item_metas, n_entities)
    category_triplets = get_category_triplets(item_metas, cat2id, iid2id, Relations.CATEGORY.value)
    add_to_train_split(data, category_triplets)
    print(f"Added categorical triplets: {len(category_triplets)}")
    n_entities += len(cat2id)
    data["id2cat"] = {cid: cat for cat, cid in cat2id.items()}

    # brand relations
    all_brands = set([it_meta.brand for it_meta in item_metas if it_meta.brand])
    brand2id = {br: n_entities + i for i, br in enumerate(all_brands)}
    brand_triplets = get_brand_triplets(item_metas, brand2id, iid2id, Relations.BRAND.value)
    add_to_train_split(data, brand_triplets)
    print(f"Added brand triplets: {len(brand_triplets)}")
    n_entities += len(brand2id)
    data["id2brand"] = {bid: brand for brand, bid in brand2id.items()}

    return n_entities
