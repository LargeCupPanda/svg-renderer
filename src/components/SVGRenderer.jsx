// src/components/SVGRenderer.jsx

import React, { useState, useRef } from 'react';
import { Copy, Download, Check, ImageIcon } from 'lucide-react';

const SVGRenderer = () => {
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('png');
  const previewRef = useRef(null);

  const validateSVG = (content) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) throw new Error('Invalid SVG format');
      return true;
    } catch (e) {
      return false;
    }
  };

  const convertSVGToImage = (format, scale = 2) => {
    return new Promise((resolve, reject) => {
      if (!previewRef.current) return reject('No SVG element found');

      const svgElement = previewRef.current.querySelector('svg');
      if (!svgElement) return reject('No SVG element found');

      const svgWidth = svgElement.viewBox?.baseVal?.width || 
                      svgElement.width?.baseVal?.value || 
                      parseInt(svgElement.getAttribute('width')) || 
                      800;
      const svgHeight = svgElement.viewBox?.baseVal?.height || 
                       svgElement.height?.baseVal?.value || 
                       parseInt(svgElement.getAttribute('height')) || 
                       600;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = svgWidth * scale;
      canvas.height = svgHeight * scale;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(scale, scale);

      const img = new Image();
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const svgUrl = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
        URL.revokeObjectURL(svgUrl);
        
        try {
          let quality = format === 'jpg' ? 0.95 : 1.0;
          const imageData = canvas.toDataURL(`image/${format}`, quality);
          resolve(imageData);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject('Image loading failed');
      };

      img.src = svgUrl;
    });
  };

  const handleImageCopy = async () => {
    try {
      const imageData = await convertSVGToImage('png', 2);
      const response = await fetch(imageData);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image:', err);
    }
  };

  const handleContextMenu = async (e) => {
    e.preventDefault();
    if (!svgContent || error) return;
    
    try {
      const imageData = await convertSVGToImage('png', 3);
      const response = await fetch(imageData);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image:', err);
    }
  };

  const handleDownload = async () => {
    try {
      let downloadData;
      let mimeType;
      let fileExtension;

      if (selectedFormat === 'svg') {
        downloadData = svgContent;
        mimeType = 'image/svg+xml';
        fileExtension = 'svg';
      } else {
        downloadData = await convertSVGToImage(selectedFormat, 3);
        mimeType = `image/${selectedFormat}`;
        fileExtension = selectedFormat;
      }

      const link = document.createElement('a');
      if (selectedFormat === 'svg') {
        const blob = new Blob([downloadData], { type: mimeType });
        link.href = URL.createObjectURL(blob);
      } else {
        link.href = downloadData;
      }
      
      link.download = `image.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleInputChange = (e) => {
    const content = e.target.value;
    setSvgContent(content);
    if (content && !validateSVG(content)) {
      setError('SVG格式无效');
    } else {
      setError('');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gray-50">
      <main className="w-full min-h-screen py-8 flex flex-col">
        <div className="w-[800px] mx-auto">
          <div className="bg-white rounded-lg shadow-md">
            <div className="border-b border-gray-200 p-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">SVG渲染器</h2>
                <div className="flex gap-2">
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="h-9 px-3 py-0 text-sm border rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="png">PNG 图片</option>
                    <option value="svg">SVG 矢量图</option>
                    <option value="jpg">JPG 图片</option>
                    <option value="gif">GIF 图片</option>
                  </select>

                  <button
                    onClick={handleDownload}
                    className={`
                      h-9 px-3 text-sm rounded-md inline-flex items-center gap-2
                      ${!svgContent || error 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}
                      transition-colors
                    `}
                    disabled={!svgContent || error}
                  >
                    <Download className="w-4 h-4" />
                    下载
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4">
			<textarea
			  className="w-full h-24 p-3 text-sm border rounded-md resize-y min-h-[96px]
				focus:outline-none focus:ring-2 focus:ring-blue-500"
			  placeholder="在此粘贴你的SVG代码..."
			  onChange={handleInputChange}
			  value={svgContent}
			/>
              {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
              )}
              
              <div 
                ref={previewRef}
                className="relative mt-4 border rounded-md bg-gray-50"
                onClick={handleImageCopy}
                onContextMenu={handleContextMenu}
                title="右键点击复制高清图片"
              >
                <div className="w-full p-4 min-h-[300px] flex items-center justify-center">
                  {svgContent && !error ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: svgContent }}
                      className="w-full flex items-center justify-center"
                    />
                  ) : (
                    <div className="text-gray-400 text-sm">
                      SVG预览将显示在这里
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

		{/* 更新footer部分的显示 */}
		<div className="mt-2 flex justify-between items-center text-sm">
		  <span className="text-blue-600">
			【友情提醒】SVG预览区域，右键点击可复制高清图片
		  </span>
		  <span className="text-gray-500">
			开发者：熊猫大侠
		  </span>
		</div>
        </div>
      </main>
    </div>
  );
};

export default SVGRenderer;