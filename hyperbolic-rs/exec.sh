#!/usr/bin/env bash

LOOPS=3
RUN_ID="test-newprep-hopdist0.8"

eval "$(conda shell.bash hook)"
conda activate keen

for i in `seq 1 $LOOPS`
do
    python train.py \
            --dataset=keen \
            --prep_name=ukeen-minuser5-minkeen2-maxkeen150-hopdist0.8 \
            --model=DistHyperbolic \
            --dims=32 \
            --loss_fn=CompositeLoss \
            --distortion_gamma=-1.0 \
            --semantic_gamma=1.0 \
            --neighbors=0.01 \
            --debug=False \
            --run_id=$RUN_ID-$i \
            --lr=1e-3 \
            --max_epochs=2000 \
            --neg_sample_size=1 \
            --margin=5 \
            --batch_size=512 \
            --patience=10 \
            --validate=10 \
            --curvature=1.0 \
            --train_c=False
done
