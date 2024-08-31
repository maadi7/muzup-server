const mongoose = require('mongoose');
const User = require('../models/User'); // Update the path to your User model

// Function to calculate genre similarity
const calculateGenreSimilarity = (genres1, genres2) => {
  const set1 = new Set(genres1);
  const set2 = new Set(genres2);
  const intersection = new Set([...set1].filter(genre => set2.has(genre)));
  return intersection.size / Math.max(set1.size, set2.size);
};

// Function to calculate artist similarity
const calculateArtistSimilarity = (artists1, artists2) => {
  const artistIds1 = new Set(artists1.map(artist => artist.id));
  const artistIds2 = new Set(artists2.map(artist => artist.id));
  const intersection = new Set([...artistIds1].filter(id => artistIds2.has(id)));
  return intersection.size / Math.max(artistIds1.size, artistIds2.size);
};

// Function to calculate track similarity
const calculateTrackSimilarity = (tracks1, tracks2) => {
  const trackIds1 = new Set(tracks1.map(track => track.id));
  const trackIds2 = new Set(tracks2.map(track => track.id));
  const intersection = new Set([...trackIds1].filter(id => trackIds2.has(id)));
  return intersection.size / Math.max(trackIds1.size, trackIds2.size);
};

// Main function to calculate match percentage
const calculateMatchPercentage = async (userId1, userId2) => {
  const user1 = await User.findById(userId1).exec();
  const user2 = await User.findById(userId2).exec();

  // Extract relevant data
  const genres1 = user1.topTracks.flatMap(track => track.artists.flatMap(artist => artist.genres));
  const genres2 = user2.topTracks.flatMap(track => track.artists.flatMap(artist => artist.genres));
  const artists1 = user1.topArtists;
  const artists2 = user2.topArtists;
  const tracks1 = user1.topTracks;
  const tracks2 = user2.topTracks;
  const recentlyPlayed1 = user1.recentlyPlayed;
  const recentlyPlayed2 = user2.recentlyPlayed;

  // Calculate similarities
  const genreSimilarity = calculateGenreSimilarity(genres1, genres2);
  const artistSimilarity = calculateArtistSimilarity(artists1, artists2);
  const trackSimilarity = calculateTrackSimilarity(tracks1, tracks2);
  const recentlyPlayedSimilarity = calculateTrackSimilarity(recentlyPlayed1, recentlyPlayed2);

  // Aggregate scores (weights can be adjusted based on importance)
  const weightedMatchPercentage = (0.2 * genreSimilarity) + 
                                  (0.3 * artistSimilarity) + 
                                  (0.3 * trackSimilarity) + 
                                  (0.2 * recentlyPlayedSimilarity);

  return weightedMatchPercentage * 100; // Return percentag
};

// Example usage


module.exports = {
    calculateMatchPercentage,
    calculateArtistSimilarity,
    calculateGenreSimilarity,
    calculateTrackSimilarity
  };
  