/**
 * 브라우즈 모드를 위한 파일 시스템 서비스
 * 
 * API를 통해 파일 시스템과 상호작용하는 함수들 제공
 */

// API 기본 URL
const API_BASE_URL = 'http://localhost:3001/api';

/**
 * 디렉토리 구조 가져오기 함수
 * @param {string} path - 확인할 디렉토리 경로
 * @returns {Promise<Object>} 디렉토리 구조 데이터
 */
export const getDirectoryStructure = async (path = 'src/browse_mode_sample_data') => {
  console.log('디렉토리 구조 요청:', path);
  
  try {
    const response = await fetch(`${API_BASE_URL}/files?path=${encodeURIComponent(path)}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`디렉토리 구조 가져오기 실패 (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    console.log('디렉토리 구조 받음:', path);
    return data;
  } catch (error) {
    console.error("디렉토리 구조 가져오기 오류:", error);
    throw error;
  }
};

/**
 * 파일 내용 가져오기 함수
 * @param {string} path - 파일 경로
 * @returns {Promise<Object|string>} 파일 내용 (JSON 또는 텍스트)
 */
export const getFileContent = async (path) => {
  console.log('파일 내용 요청:', path);
  
  try {
    const response = await fetch(`${API_BASE_URL}/file-content?path=${encodeURIComponent(path)}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`파일 내용 가져오기 실패 (${response.status}): ${errorText}`);
    }
    
    // 파일 타입에 따라 다른 처리
    const contentType = response.headers.get('Content-Type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log('JSON 파일 내용 받음:', path);
    } else {
      data = await response.text();
      console.log('텍스트 파일 내용 받음:', path);
    }
    
    return data;
  } catch (error) {
    console.error("파일 내용 가져오기 오류:", error);
    throw error;
  }
}; 