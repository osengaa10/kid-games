// Crops a square out of an image and saves it at a given size, for the launcher's game pictures.
// Usage: swift scripts/crop-image.swift <in> <x> <y> <size> <out size> <out.jpg|out.png>
// x, y and size are in the source image's pixels, measured from the top-left corner.
import AppKit

let a = CommandLine.arguments
guard a.count == 7, let x = Double(a[2]), let y = Double(a[3]), let size = Double(a[4]), let outSize = Int(a[5]) else {
  print("usage: swift scripts/crop-image.swift <in> <x> <y> <size> <out size> <out.jpg|out.png>")
  exit(1)
}
guard let src = NSImage(contentsOf: URL(fileURLWithPath: a[1])),
      let cg = src.cgImage(forProposedRect: nil, context: nil, hints: nil),
      let cropped = cg.cropping(to: CGRect(x: x, y: y, width: size, height: size)) else { fatalError("can't read or crop \(a[1])") }

let ctx = CGContext(data: nil, width: outSize, height: outSize, bitsPerComponent: 8, bytesPerRow: outSize * 4,
                    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
ctx.interpolationQuality = .high
ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: outSize, height: outSize))
let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
let out = URL(fileURLWithPath: a[6])
let jpeg = out.pathExtension.lowercased().hasPrefix("jp")
let data = rep.representation(using: jpeg ? .jpeg : .png, properties: jpeg ? [.compressionFactor: 0.85] : [:])!
try! data.write(to: out)
print("wrote \(a[6]) (\(outSize)x\(outSize), \(data.count / 1024) KB)")
