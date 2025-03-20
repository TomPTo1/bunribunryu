import React, { useState, useEffect } from 'react';
import { fetchChannels } from '../services/api';
import Column from './Column';

const ChannelList = ({ onChannelSelect, selectedChannel }) => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getChannels = async () => {
      try {
        setLoading(true);
        const response = await fetchChannels();
        console.log('API Response:', response);
        setChannels(response.list || []);
        setError(null);
      } catch (err) {
        setError(err.message);
        setChannels([]);
      } finally {
        setLoading(false);
      }
    };

    getChannels();
  }, []);

  return (
    <Column
      title="채널 목록"
      items={channels}
      onItemClick={onChannelSelect}
      renderItem={{
        display: channel => channel.채널키 || 'Unknown Channel',
        value: channel => channel.채널키
      }}
      selectedItem={selectedChannel}
      loading={loading}
      error={error}
      emptyMessage="채널 정보가 없습니다."
    />
  );
};

export default ChannelList; 