import math
from functools import partial

import numpy as np
import tensorflow as tf

import process_data

print("before process_data")
process_data.process_wav()
print("after process_data")
# Learning rate
lr = 0.0001

# L2 regularization
l2 = 0.0001

inputs = 12348
hidden_1_size = 8400
hidden_2_size = 3440
hidden_3_size = 2800

# Change the epochs variable to define the
# number of times we iterate through all our batches
epochs = 50

# Change the batch_size variable to define how many songs to load per batch
batch_size = 50

# Change the batches variable to change the number of batches you want per epoch
batches = 29  # floor(training_size=1486 / batch_size=50)

resolver = tf.distribute.cluster_resolver.TPUClusterResolver(tpu='latent-space-290008')
tf.config.experimental_connect_to_cluster(resolver)
# This is the TPU initialization code that has to be at the beginning.
tf.tpu.experimental.initialize_tpu_system(resolver)
print("All devices: ", tf.config.list_logical_devices('TPU'))

strategy = tf.distribute.experimental.TPUStrategy(resolver)

# Define our placeholder with shape [?, 12348]
X = tf.compat.v1.placeholder(tf.float32, shape=[None, inputs])
l2_regularizer = tf.keras.regularizers.l2(0.5 * l2)

autoencoder_dnn = partial(tf.compat.v1.layers.dense,
                          activation=tf.nn.elu,
                          kernel_initializer=tf.compat.v1.keras.initializers.VarianceScaling(scale=2.0),
                          kernel_regularizer=tf.keras.regularizers.l2(0.5 * l2))

hidden_1 = autoencoder_dnn(X, hidden_1_size)
hidden_2 = autoencoder_dnn(hidden_1, hidden_2_size)
hidden_4 = autoencoder_dnn(hidden_2, hidden_3_size)
hidden_5 = autoencoder_dnn(hidden_4, hidden_2_size)
outputs = autoencoder_dnn(hidden_5, inputs, activation=None)

reconstruction_loss = tf.reduce_mean(input_tensor=tf.square(outputs - X))
reg_loss = tf.compat.v1.get_collection(tf.compat.v1.GraphKeys.REGULARIZATION_LOSSES)
loss = tf.add_n([reconstruction_loss] + reg_loss)

optimizer = tf.compat.v1.train.AdamOptimizer(lr)
training_op = optimizer.minimize(loss)
init = tf.compat.v1.global_variables_initializer()


def next_batch(c_batch, batch_size, sess):
    ch1_arr = []
    ch2_arr = []
    wav_arr_ch1, wav_arr_ch2, sample_rate = process_data.get_next_batch(c_batch, batch_size, sess)

    for sub_arr in wav_arr_ch1:
        batch_size_ch1 = math.floor(len(sub_arr) / inputs)
        sub_arr = sub_arr[:(batch_size_ch1 * inputs)]
        ch1_arr.append(np.array(sub_arr).reshape(batch_size_ch1, inputs))

    for sub_arr in wav_arr_ch2:
        batch_size_ch2 = math.floor(len(sub_arr) / inputs)
        sub_arr = sub_arr[:(batch_size_ch2 * inputs)]
        ch2_arr.append(np.array(sub_arr).reshape(batch_size_ch2, inputs))

    return np.array(ch1_arr), np.array(ch2_arr), sample_rate


saver = tf.compat.v1.train.Saver(keep_checkpoint_every_n_hours=0.5)
# Run training
with tf.compat.v1.Session() as sess:
    init.run()

    for epoch in range(epochs):
        epoch_loss = []
        print("Epoch: " + str(epoch))
        for i in range(batches):
            ch1_song, ch2_song, sample_rate = next_batch(i, batch_size, sess)
            total_songs = np.hstack([ch1_song, ch2_song])
            batch_loss = []

            for j in range(len(total_songs)):
                x_batch = total_songs[j]
                _, l = sess.run([training_op, loss], feed_dict={X: x_batch})
                batch_loss.append(l)
                print("Song loss: " + str(l))

            print("Curr Epoch: " + str(epoch) + " Curr Batch: " + str(i) + "/" + str(batches))
            print("Batch Loss: " + str(np.mean(batch_loss)))
            epoch_loss.append(np.mean(batch_loss))

        print("Epoch Avg Loss: " + str(np.mean(epoch_loss)))

        if epoch % 35 == 0:  # approx 1000 steps of Adam optimizer
            saver.save(sess, 'rnn-vae', global_step=epoch)

        if epoch % 1000 == 0:
            ch1_song_new, ch2_song_new, sample_rate_new = next_batch(2, 1, sess)
            x_batch = np.hstack([ch1_song_new, ch2_song_new])[0]
            print("Sample rate: " + str(sample_rate_new))

            orig_song = []
            full_song = []
            evaluation = outputs.eval(feed_dict={X: x_batch})
            print("Output: " + str(evaluation))
            full_song.append(evaluation)
            orig_song.append(x_batch)

            # Merge the nested arrays
            orig_song = np.hstack(orig_song)
            full_song = np.hstack(full_song)

            # Compute and split the channels
            orig_song_ch1 = orig_song[:math.floor(len(orig_song) / 2)]
            orig_song_ch2 = orig_song[math.floor(len(orig_song) / 2):]
            full_song_ch1 = full_song[:math.floor(len(full_song) / 2)]
            full_song_ch2 = full_song[math.floor(len(full_song) / 2):]

            # Save both the untouched song and reconstructed song to the 'output' folder
            process_data.save_to_wav(full_song_ch1, full_song_ch2, sample_rate, orig_song_ch1, orig_song_ch2, epoch,
                                     'output', sess)
