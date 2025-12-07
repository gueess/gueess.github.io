#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
from PIL import Image

def get_file_size_mb(file_path):
    return os.path.getsize(file_path) / (1024 * 1024)

def compress_image(input_path, max_size_mb=2):
    base_name = os.path.splitext(input_path)[0]
    output_path = f"{base_name}_compressed.jpg"
    
    img = Image.open(input_path)
    
    if img.mode in ('RGBA', 'LA', 'P'):
        if img.mode == 'P':
            img = img.convert('RGBA')
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
        img = background
    
    quality = 85
    while quality >= 50:
        img.save(output_path, 'JPEG', quality=quality, optimize=True)
        if get_file_size_mb(output_path) <= max_size_mb:
            return output_path
        quality -= 5
    
    scale = 0.95
    while scale >= 0.5:
        new_width = int(img.width * scale)
        new_height = int(img.height * scale)
        resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        resized_img.save(output_path, 'JPEG', quality=75, optimize=True)
        if get_file_size_mb(output_path) <= max_size_mb:
            return output_path
        scale -= 0.05
    
    return output_path

if __name__ == '__main__':
    input_file = 'd9562e23d2e345e2a017e539443c7393.png'
    original_size = get_file_size_mb(input_file)
    output_file = compress_image(input_file, max_size_mb=2)
    compressed_size = get_file_size_mb(output_file)
    print(f"压缩完成: {original_size:.2f}MB → {compressed_size:.2f}MB")
    print(f"输出文件: {output_file}")

