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

CONFIG = {
    'string': {
        'run_id': ('Name of the run to write down logs and config', 'fooh'),
        'prep_dir': ('Path to data directory', 'data/prep'),
        'dataset': ('Dataset (keen, gem, ml-1m or amazon)', 'amazon'),
        'prep_name': ('Name of prep file to load', 'musicins-top10'),
        'logs_dir': ('Path to logs directory', 'logs/'),
        'ckpt_dir': ('Path to checkpoint directory', 'ckpt/'),
        'model': ('Model', 'RotatE'),
        'loss_fn': ('Loss function to use', 'BCELoss'),
        'initializer': ('Which initializer to use', 'GlorotNormal'),
        'regularizer': ('Regularizer', 'L2Regularizer'),
        'optimizer': ('Optimizer', 'adam'),
        'dtype': ('Precision to use', 'float64'),
        'results_file': ('Name of file to export results', 'results'),
    },
    'float': {
        'lr': ('Learning rate', 1e-3),
        'lr_decay': ('Learning rate decay', 0.96),
        'min_lr': ('Minimum learning rate decay', 1e-5),
        'gamma': ('Weight for distortion loss', 1),
        'entity_reg': ('Regularization weight for entity embeddings', 0),
        'relation_reg': ('Regularization weight for relation embeddings', 0),
        'hinge_margin': ('Margin for hinge based models', 1),
        'curvature': ('Curvature in case of using hyperbolic space', 1.),
    },
    'integer': {
        'patience': ('Number of validation steps before early stopping', 10),
        'validate': ('Number of epochs before computing validation metrics', 10),
        'checkpoint': ('Number of epochs before checkpointing the model', 5),
        'max_epochs': ('Maximum number of epochs to train for', 12),
        'dims': ('Embeddings dimension', 32),
        'batch_size': ('Batch size', 1000),
        'eval_batch_size': ('Eval Batch size', 1024),
        'neg_sample_size': ('Negative sample size, -1 to use loss without negative sampling', 1),
        'seed': ('Random seed', 42),
        'gpu_index': ('GPU index, in case of working with more than one', 0),
    },
    'boolean': {
        'train_c': ('Whether to train the hyperbolic curvature or not', False),
        'debug': ('If debug is true, only use 1000 examples for debugging purposes', True),
        'save_logs': ('Whether to save the training logs or not', True),
        'print_logs': ('Whether to print the training logs to stdout', True),
        'save_model': ('Whether to save the model weights', True),
        'invert_relations': ('For each triple (h, r, t) it also adds (t, r^-1, h)', True),
        'use_semantic_relation': ('Whether to use this relation or not', False),
        'use_cobuy_relation': ('Whether to use this relation or not', False),
        'use_coview_relation': ('Whether to use this relation or not', True),
        'use_category_relation': ('Whether to use this relation or not', False),
        'use_brand_relation': ('Whether to use this relation or not', True),
        'unique_relation': ('Whether to convert allowed relations into only one', False),
    }
}
