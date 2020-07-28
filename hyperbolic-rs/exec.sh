#!/usr/bin/env bash

RUN_ID="keen-hyper32-semantic-ga1-th0p7-nei0p01"

eval "$(conda shell.bash hook)"
conda activate keen
python train.py \
        --dataset=keen \
        --model=DistHyperbolic \
        --dims=32 \
        --loss_fn=SemanticLoss \
        --distortion_gamma=1. \
        --neighbors=0.01 \
        --item_item_file=item_item_distance_th0.7.pickle \
        --debug=False \
        --run_id=$RUN_ID \
        --lr=1e-3 \
        --max_epochs=1000 \
        --neg_sample_size=1 \
        --margin=2 \
        --batch_size=2048 \
        --neg_sample_size=1 \
        --patience=10 \
        --validate=10 \
        --curvature=1.0 \
        --train_c=False \

