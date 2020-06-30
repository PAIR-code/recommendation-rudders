#!/usr/bin/env bash

RUN_ID="keen-euclid64-lr3e-3"

eval "$(conda shell.bash hook)"
conda activate keen
python train.py \
        --dataset=keen \
        --model=DistEuclidean \
        --dims=64 \
        --loss_fn=PairwiseHingeLoss \
        --lr=3e-3 \
        --max_epochs=1000 \
        --margin=1 \
        --batch_size=1024 \
        --neg_sample_size=1 \
        --validate=10 \
        --patience=10 \
        --debug=False \
        --run_id=$RUN_ID \

