from pathlib import Path

PREP_PATH = Path("data/prep")

CONFIG = {
    'string': {
        'dataset': ('Dataset', 'ml-1m/'),
        'model': ('Model', 'DistE'),
        'data_dir':
            ('Path to data directory',
             'data/'),
        'save_dir': ('Path to logs directory',
                     'logs/'),
        'loss_fn': ('Loss function to use', 'PairwiseHingeFn'),
        'initializer': ('Which initializer to use', 'GlorotUniform'),
        'regularizer': ('Regularizer', 'L2'),
        'optimizer': ('Optimizer', 'Adam'),
        'bias': ('Bias term', 'learn'),
        'dtype': ('Precision to use', 'float64'),
    },
    'float': {
        'lr': ('Learning rate', 1e-3),
        'lr_decay': ('Learning rate decay', 0.96),
        'min_lr': ('Minimum learning rate decay', 1e-5),
        'gamma': ('Margin for distance-based losses', 0),
        'item_reg': ('Regularization weight for item embeddings', 0),
        'user_reg': ('Regularization weight for user embeddings', 0),
        'm': ('Margin for hinge based models', 1)
    },
    'integer': {
        'patience': ('Number of validation steps before early stopping', 30),
        'valid': ('Number of epochs before computing validation metrics', 10),
        'checkpoint': ('Number of epochs before checkpointing the model', 5),
        'max_epochs': ('Maximum number of epochs to train for', 100),
        'rank': ('Embeddings dimension', 32),
        'batch_size': ('Batch size', 1000),
        'neg_sample_size':
            ('Negative sample size, -1 to use loss without negative sampling',
             1),
    },
    'boolean': {
        'train_c': ('Whether to train the hyperbolic curvature or not', False),
        'debug': ('If debug is true, only use 1000 examples for'
                  ' debugging purposes', True),
        'save_logs':
            ('Whether to save the training logs or print to stdout', True),
        'save_model': ('Whether to save the model weights', False),
        'double_neg': ('Whether to use double negative sampling or not', False)
    }
}