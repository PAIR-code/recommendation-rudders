
CONFIG = {
    'string': {
        'run_id': ('Name of the run to write down logs and config', 'fooh'),
        'prep_dir': ('Path to data directory', 'data/prep'),
        'dataset': ('Dataset', 'ml-1m'),
        'logs_dir': ('Path to logs directory', 'logs/'),
        'ckpt_dir': ('Path to checkpoint directory', 'ckpt/'),
        'model': ('Model', 'DistanceDistortionHyperbolic'),
        'loss_fn': ('Loss function to use', 'HingeDistortionLoss'),
        'initializer': ('Which initializer to use', 'GlorotUniform'),
        'regularizer': ('Regularizer', 'L2Regularizer'),
        'optimizer': ('Optimizer', 'adam'),
        'dtype': ('Precision to use', 'float64'),
    },
    'float': {
        'lr': ('Learning rate', 1e-3),
        'lr_decay': ('Learning rate decay', 0.96),
        'min_lr': ('Minimum learning rate decay', 1e-5),
        'gamma': ('Weight for distortion loss', 1),
        'item_reg': ('Regularization weight for item embeddings', 0),
        'user_reg': ('Regularization weight for user embeddings', 0),
        'margin': ('Margin for hinge based models', 1)
    },
    'integer': {
        'patience': ('Number of validation steps before early stopping', 30),
        'validate': ('Number of epochs before computing validation metrics', 10),
        'checkpoint': ('Number of epochs before checkpointing the model', 5),
        'max_epochs': ('Maximum number of epochs to train for', 100),
        'dims': ('Embeddings dimension', 32),
        'batch_size': ('Batch size', 1000),
        'neg_sample_size': ('Negative sample size, -1 to use loss without negative sampling', 1),
        'seed': ('Random seed', 42),
    },
    'boolean': {
        'train_c': ('Whether to train the hyperbolic curvature or not', False),
        'debug': ('If debug is true, only use 1000 examples for debugging purposes', True),
        'save_logs': ('Whether to save the training logs or not', True),
        'print_logs': ('Whether to print the training logs to stdout', True),
        'save_model': ('Whether to save the model weights', True),
        'double_neg': ('Whether to use double negative sampling or not', False)
    }
}
