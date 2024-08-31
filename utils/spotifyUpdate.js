const cron = require('node-cron');
const axios = require('axios');
const User = require('../models/User'); // Adjust the path as needed

// Function to refresh the access token
async function refreshAccessToken(refreshToken) {
  const response = await axios.post('https://accounts.spotify.com/api/token', null, {
    params: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
    headers: {
      'Authorization': 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data.access_token;
}

// Function to fetch user's top artists
async function fetchTopArtists(accessToken) {
  const response = await axios.get('https://api.spotify.com/v1/me/top/artists', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  return response.data.items.map(artist => ({
    id: artist.id,
    name: artist.name,
    followers: artist.followers.total,
    genres: artist.genres,
    images: artist.images.map(image => image.url),
    popularity: artist.popularity,
    type: artist.type,
  }));
}

// Function to fetch user's top tracks
async function fetchTopTracks(accessToken) {
  const response = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  return response.data.items.map(track => ({
    id: track.id,
    name: track.name,
    popularity: track.popularity,
    is_local: track.is_local,
    preview_url: track.preview_url,
    type: track.type,
    track_number: track.track_number,
    album: {
      album_type: track.album.album_type,
      id: track.album.id,
      name: track.album.name,
      images: track.album.images.map(image => image.url),
    },
    artists: track.artists.map(artist => ({
      id: artist.id,
      name: artist.name,
      type: artist.type,
    })),
  }));
}

// Function to fetch user's recently played tracks
async function fetchRecentlyPlayed(accessToken) {
  const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  return response.data.items.map(item => ({
    played_at: item.played_at,
    id: item.track.id,
    name: item.track.name,
    popularity: item.track.popularity,
    is_local: item.track.is_local,
    preview_url: item.track.preview_url,
    type: item.track.type,
    track_number: item.track.track_number,
    album: {
      album_type: item.track.album.album_type,
      id: item.track.album.id,
      name: item.track.album.name,
      images: item.track.album.images.map(image => image.url),
    },
    artists: item.track.artists.map(artist => ({
      id: artist.id,
      name: artist.name,
      type: artist.type,
    })),
  }));
}

// Function to update recently played tracks
async function updateRecentlyPlayed() {
  const users = await User.find({ spotifyRefreshToken: { $exists: true } });

  for (const user of users) {
    try {
      const accessToken = await refreshAccessToken(user.spotifyRefreshToken);
      const recentlyPlayed = await fetchRecentlyPlayed(accessToken);

      await User.findByIdAndUpdate(user._id, {
        spotifyAccessToken: accessToken,
        recentlyPlayed,
      });

      console.log(`Updated recently played tracks for user: ${user.username}`);
    } catch (error) {
      console.error(`Error updating recently played tracks for user ${user.username}:`, error);
    }
  }
}

// Function to update top artists and tracks
async function updateTopArtistsAndTracks() {
  const users = await User.find({ spotifyRefreshToken: { $exists: true } });

  for (const user of users) {
    try {
      const accessToken = await refreshAccessToken(user.spotifyRefreshToken);
      const [topArtists, topTracks] = await Promise.all([
        fetchTopArtists(accessToken),
        fetchTopTracks(accessToken),
      ]);

      await User.findByIdAndUpdate(user._id, {
        spotifyAccessToken: accessToken,
        topArtists,
        topTracks,
      });

      console.log(`Updated top artists and tracks for user: ${user.username}`);
    } catch (error) {
      console.error(`Error updating top artists and tracks for user ${user.username}:`, error);
    }
  }
}

// Schedule the recently played update job every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Running recently played tracks update job');
  updateRecentlyPlayed();
});

// Schedule the top artists and tracks update job every 24 hours
cron.schedule('0 0 * * *', () => {
  console.log('Running top artists and tracks update job');
  updateTopArtistsAndTracks();
});

module.exports = {
  updateRecentlyPlayed,
  updateTopArtistsAndTracks,
};
