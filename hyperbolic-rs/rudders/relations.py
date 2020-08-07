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
    USER_ITEM = 0
    COBUY = 1
    COVIEW = 2
    CATEGORY = 3
    BRAND = 4
    SEM_HIGH_SIM = 5
    SEM_MEDIUM_SIM = 6
    SEM_LOW_SIM = 7
