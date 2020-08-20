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

from enum import Enum


class Relations(Enum):
    """Allowed types of relations that models support"""
    USER_ITEM = 0               # user item interactions
    COBUY = 1                   # items that were co-bought with other items
    COVIEW = 2                  # items that were co-viewed with other items
    CATEGORY = 3                # item has-category categ_name relation
    BRAND = 4                   # item has-brand brand_name relation
    # semantic similarity between items.
    # It is measured as the cosine similarity between semantic item embeddings
    SEM_HIGH_SIM = 5            # high semantic similarity: cosine similarity between 0.9 and 1
    SEM_MEDIUM_SIM = 6          # medium semantic similarity: cosine similarity between 0.8 and 0.9
    SEM_LOW_SIM = 7             # low semantic similarity: cosine similarity between 0.7 and 0.8
