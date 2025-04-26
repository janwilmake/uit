function curlspeed() {
  curl -u jan:secret -s -o /dev/null -w "Size: %{size_download} bytes | Time: %{time_total}s" $1
  speed=$(curl -s -o /dev/null -w "%{speed_download}" $1)
  speed_mb=$(echo "scale=2; $speed/1048576" | bc)
  echo " | Speed: $speed_mb MB/s"
}

curlspeed "https://ingestzip.uithub.com/https://github.com/oven-sh/bun/archive/refs/heads/main.zip?pathPatterns=*.md"