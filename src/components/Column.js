import React from 'react';
import './Column.css';

const Column = ({ title, header, items, onItemClick, renderItem, selectedItem, loading, error, emptyMessage }) => {
  if (loading) return <div className="column-container"><div className="loading">로딩 중...</div></div>;
  if (error) return <div className="column-container"><div className="error">에러: {error}</div></div>;

  return (
    <div className="column-container">
      {title && <h2 className="column-title">{title}</h2>}
      {header && <div className="column-header">{header}</div>}
      <div className="column-content">
        {items && items.length > 0 ? (
          items.map((item, index) => (
            <div
              key={index}
              className={`column-item ${selectedItem === (renderItem.value ? renderItem.value(item) : item) ? 'selected' : ''}`}
              onClick={() => onItemClick && onItemClick(renderItem.value ? renderItem.value(item) : item)}
            >
              {renderItem.display ? renderItem.display(item) : item}
            </div>
          ))
        ) : (
          <div className="column-empty">{emptyMessage || '데이터가 없습니다.'}</div>
        )}
      </div>
    </div>
  );
};

export default Column; 