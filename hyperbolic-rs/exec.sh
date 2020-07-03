#!/usr/bin/env bash

RUN_ID="keen-euclid64-lr3e-3"

eval "$(conda shell.bash hook)"
conda activate keen
python train.py \
        --dataset=keen \
        --model=DistEuclidean \
        --dims=64 \
        --loss_fn=PairwiseHingeLoss \
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

