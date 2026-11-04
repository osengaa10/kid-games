// Trims an even border off a square image and writes a 1024x1024 opaque PNG.
// The source art has rounded black corners baked in; iOS rounds icons itself,
// so trim past them (100px for assets/icon-source.png) to get a full square.
// Usage: swift scripts/make-icon.swift assets/icon-source.png 100 assets/icon-1024.png
import AppKit

let args = CommandLine.arguments
let inset = CGFloat(Double(args[2])!)
guard let src = NSImage(contentsOf: URL(fileURLWithPath: args[1])),
      let cg = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fatalError("can't read") }
let side = CGFloat(cg.width) - inset * 2
guard let cropped = cg.cropping(to: CGRect(x: inset, y: inset, width: side, height: side)) else { fatalError("crop") }

let out = 1024
let ctx = CGContext(data: nil, width: out, height: out, bitsPerComponent: 8, bytesPerRow: out * 4,
                    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
ctx.interpolationQuality = .high
ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: out, height: out))
let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[3]))
print("wrote \(args[3]) (\(out)x\(out), cropped \(Int(inset))px from each side of \(cg.width))")
