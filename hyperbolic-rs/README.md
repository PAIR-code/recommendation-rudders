# recommendation-rudders

Implementation of knowledge graph-based recommender systems in Euclidean, Complex and 
Hyperbolic spaces.

Knowledge graph models available:

 - Simple factorization
 - TransE [1]
 - RotatE [2]
 - Rotate-Reflect [3]
 - MuR [4]
 - UserAttentive

## Dependencies
 - ``python >= 3.7``
 - ``tensorflow >= 2.2``
 - ``tensorflow_hub``
 - ``absl``
 - ``tqdm``
 - ``networkx``: for preprocessing only
 
## Reproducing experiments

### 1. Download Amazon review data
From [Amazon Review Data (2018)](https://nijianmo.github.io/amazon/index.html), for a given 
category branch of the dataset ("Musical Instruments", "Video Games", etc), download the 
5-core review file and the metadata. Store the ``*.json.gz`` files in ``data/amazon``

### 2. Build semantic similarity graph

Computes semantic embeddings with the _Universal Sentence Encoder_ based on product reviews.
Builds semantic similarity graph based on distance in the embedding space.

Example made for "Musical Instruments".
```
python item_graph.py --item=amazon --dataset_path=data/amazon \
        --amazon_reviews=Musical_Instruments_5.json.gz \
        --amazon_meta=meta_Musical_Instruments.json.gz
```

The output of this script will be the file 
``data/amazon/Musical_Instruments_Musical_Instruments_cosdist_th0.6.pickle``
with the semantic distance between products.

### 3. Preprocess data 
The parameter ``prep_id`` can be set to store different preprocessing configurations:
 
```
python preprocess.py --item=amazon --dataset_path=data/amazon \
        --amazon_reviews=Musical_Instruments_5.json.gz \
        --amazon_meta=meta_Musical_Instruments.json.gz \
        --item_item_file=musicins_musicins_cosine_distance_th0.6.pickle \
        --add_extra_relations=True --prep_id=amzn-musicins
```

The output of this script will be the "prep file" and it will be stored in 
``data/prep/amazon/amzn-musicins.pickle``
### 4. Train model
The name of the preprocessing used in the previous step must be given as a parameter.
```
python train --prep_name=amzn-musicins --run_id=my_trained_model
```

More parameters can be set on the ``config.py`` file.

By default the trained models will be exported under the ``ckpt/`` directory.

## Acknowledgements
We thank [Chami et al.](https://www.aclweb.org/anthology/2020.acl-main.617/) for making their [code](https://github.com/tensorflow/neural-structured-learning/tree/efff158a4f77ae81a464d98c4d51ebe2fa78f2b4/research/kg_hyp_emb) publicly available.

## References
[1]: Bordes et al. "Translating embeddings for modeling multirelational data". 
Advances in Neural Information Processing Systems. 2013

[2]: Sun et al. "Rotate: Knowledge graph embedding by relational rotation in complex space". 
International Conference on Learning Representations. 2019.

[3]: Chami et al. "Low-Dimensional Hyperbolic Knowledge Graph Embeddings". 
Annual Meeting of the Association for Computational Linguistics. 2020.

[4]: Balažević et al. "Multi-relational Poincaré Graph Embeddings". 
Advances in neural information processing systems. 2019.