class LrModuleGen < Formula
  desc "template module generator"
  homepage "https://github.com/1is10/homebrew-lr-module-gen"
  url "https://github.com/1is10/homebrew-lr-module-gen/releases/download/0.9.0/lr-module-gen-macos-x64.tar.gz"
  sha256 "0a3a9bd66b868447331b9dd281e2e8e866f937abbc6a7929777d7c45da845ff1"
  version "0.9.0"
  def install
    bin.install "lr-module-gen"
  end
end

